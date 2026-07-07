"""
Cricket shot classifier over MediaPipe landmark SEQUENCES (not pixels).

Replaces the old pixel CNN+LSTM (train_action_model.py, removed): a classifier
over pose landmark sequences is smaller (< 2 MB), trains on far less data, is
viewpoint-robust, and can run in the browser via ONNX — keeping the
"processed locally" privacy story true.

COLAB / LOCAL SETUP (no secrets in this file — use Colab's Secrets panel or
environment variables for any dataset credentials):

    pip install torch mediapipe opencv-python numpy scipy onnx onnxruntime

DATA LAYOUT — one folder per class, videos or pre-extracted landmark JSONs:

    data/
      cover_drive/     clip1.mp4 clip2.mp4 ...
      pull_shot/       ...
      straight_drive/  ...
      defensive_block/ ...
      flick_shot/      ...
      bowling_legal/   ...
      bowling_illegal/ ...

Landmark JSONs (from api/tools/capture_reference.py-style extraction) are
lists of frames, each frame a list of 33 {x,y,z,visibility} dicts (world
landmarks). Videos are processed with MediaPipe at load time.

USAGE:
    python train_landmark_classifier.py data/ --epochs 60 --out shot_classifier
Outputs: shot_classifier.pt, shot_classifier.onnx, and printed test metrics.
"""

import argparse
import json
import os
import random
import sys

import numpy as np

SEQ_LEN = 48          # frames per clip after resampling
N_LANDMARKS = 33
N_FEATURES = N_LANDMARKS * 3  # xyz per landmark = 99
# Classes whose label must flip under horizontal mirroring (none currently —
# add e.g. ("cut_shot_off_side", "cut_shot_leg_side") pairs here if introduced).
MIRROR_LABEL_SWAPS = {}


# ─── PREPROCESSING (port faithfully to src/shotClassifier.js) ───────────────

def normalize_frame(landmarks):
    """
    Center on the hip midpoint and scale by torso length so the model sees
    body pose, not camera position. landmarks: (33, 3) array.
    """
    hips = (landmarks[23] + landmarks[24]) / 2.0
    shoulders = (landmarks[11] + landmarks[12]) / 2.0
    torso = np.linalg.norm(shoulders - hips)
    if torso < 1e-6:
        torso = 1.0
    return (landmarks - hips) / torso


def resample_sequence(frames, target_len=SEQ_LEN):
    """Linear-interpolate a (T, 33, 3) sequence to (target_len, 33, 3)."""
    frames = np.asarray(frames, dtype=np.float32)
    t_src = np.linspace(0.0, 1.0, num=len(frames))
    t_dst = np.linspace(0.0, 1.0, num=target_len)
    out = np.empty((target_len,) + frames.shape[1:], dtype=np.float32)
    for i in range(frames.shape[1]):
        for j in range(frames.shape[2]):
            out[:, i, j] = np.interp(t_dst, t_src, frames[:, i, j])
    return out


def smooth_sequence(frames, window=7, polyorder=2):
    """Savitzky-Golay smoothing per landmark per axis (matches the app)."""
    from scipy.signal import savgol_filter

    frames = np.asarray(frames, dtype=np.float32)
    if len(frames) < window:
        return frames
    return savgol_filter(frames, window_length=window, polyorder=polyorder, axis=0)


def preprocess(frames):
    """(T, 33, 3) raw world landmarks → (SEQ_LEN, 99) model input."""
    frames = smooth_sequence(frames)
    frames = np.stack([normalize_frame(f) for f in frames])
    frames = resample_sequence(frames)
    return frames.reshape(SEQ_LEN, N_FEATURES)


# ─── DATA LOADING ────────────────────────────────────────────────────────────

def landmarks_from_video(path):
    """Extract (T, 33, 3) world landmarks from a video with MediaPipe."""
    import cv2
    import mediapipe as mp

    frames = []
    cap = cv2.VideoCapture(path)
    with mp.solutions.pose.Pose(model_complexity=1, min_detection_confidence=0.5) as pose:
        while True:
            ok, frame = cap.read()
            if not ok:
                break
            results = pose.process(cv2.cvtColor(frame, cv2.COLOR_BGR2RGB))
            lms = results.pose_world_landmarks or results.pose_landmarks
            if lms:
                frames.append([[p.x, p.y, p.z] for p in lms.landmark])
    cap.release()
    return np.asarray(frames, dtype=np.float32)


def landmarks_from_json(path):
    with open(path) as fh:
        seq = json.load(fh)
    return np.asarray(
        [[[p["x"], p["y"], p["z"]] for p in frame] for frame in seq], dtype=np.float32
    )


def load_dataset(root):
    """Return (clips, labels, class_names). One entry per VIDEO (never per frame)."""
    class_names = sorted(
        d for d in os.listdir(root) if os.path.isdir(os.path.join(root, d))
    )
    clips, labels = [], []
    for ci, cls in enumerate(class_names):
        for name in sorted(os.listdir(os.path.join(root, cls))):
            path = os.path.join(root, cls, name)
            try:
                if name.endswith(".json"):
                    seq = landmarks_from_json(path)
                elif name.lower().endswith((".mp4", ".mov", ".avi", ".webm", ".mkv")):
                    seq = landmarks_from_video(path)
                else:
                    continue
            except Exception as e:  # noqa: BLE001 — skip unreadable clips, keep training
                print(f"  skip {path}: {e}")
                continue
            if len(seq) < 10:
                print(f"  skip {path}: only {len(seq)} tracked frames")
                continue
            clips.append(seq)
            labels.append(ci)
        print(f"{cls}: {labels.count(ci)} clips")
    return clips, labels, class_names


def stratified_split(labels, seed=42, train=0.70, val=0.15):
    """70/15/15 split BY VIDEO, stratified per class. Returns index lists."""
    rng = random.Random(seed)
    by_class = {}
    for i, y in enumerate(labels):
        by_class.setdefault(y, []).append(i)
    tr, va, te = [], [], []
    for idxs in by_class.values():
        rng.shuffle(idxs)
        n = len(idxs)
        n_tr, n_va = max(1, round(n * train)), max(1, round(n * val))
        tr += idxs[:n_tr]
        va += idxs[n_tr: n_tr + n_va]
        te += idxs[n_tr + n_va:]
    return tr, va, te


# ─── AUGMENTATION (train split only) ─────────────────────────────────────────

def augment(seq, label, class_names, rng):
    """Random mirror / rotation / scale jitter / temporal crop on raw landmarks."""
    seq = seq.copy()
    # Horizontal mirror: flip x and swap left/right landmark indices.
    if rng.random() < 0.5:
        seq[:, :, 0] *= -1
        swap = [
            (11, 12), (13, 14), (15, 16), (17, 18), (19, 20), (21, 22),
            (23, 24), (25, 26), (27, 28), (29, 30), (31, 32),
            (1, 4), (2, 5), (3, 6), (7, 8), (9, 10),
        ]
        for a, b in swap:
            seq[:, [a, b]] = seq[:, [b, a]]
        cls = class_names[label]
        if cls in MIRROR_LABEL_SWAPS:
            label = class_names.index(MIRROR_LABEL_SWAPS[cls])
    # Small rotation around the vertical axis.
    theta = rng.uniform(-0.15, 0.15)
    c, s = np.cos(theta), np.sin(theta)
    x, z = seq[:, :, 0].copy(), seq[:, :, 2].copy()
    seq[:, :, 0] = c * x + s * z
    seq[:, :, 2] = -s * x + c * z
    # Scale jitter.
    seq *= rng.uniform(0.9, 1.1)
    # Temporal crop jitter (keep >= 80% of the clip).
    n = len(seq)
    keep = int(n * rng.uniform(0.8, 1.0))
    start = rng.randint(0, n - keep)
    return seq[start: start + keep], label


# ─── MODEL ───────────────────────────────────────────────────────────────────

def build_model(n_classes):
    import torch.nn as nn

    # Small 1D temporal CNN over (batch, 99, 48). Exported size well under 2 MB.
    return nn.Sequential(
        nn.Conv1d(N_FEATURES, 96, kernel_size=5, padding=2), nn.BatchNorm1d(96), nn.ReLU(),
        nn.MaxPool1d(2),
        nn.Conv1d(96, 128, kernel_size=3, padding=1), nn.BatchNorm1d(128), nn.ReLU(),
        nn.MaxPool1d(2),
        nn.Conv1d(128, 128, kernel_size=3, padding=1), nn.BatchNorm1d(128), nn.ReLU(),
        nn.AdaptiveAvgPool1d(1), nn.Flatten(),
        nn.Dropout(0.3), nn.Linear(128, n_classes),
    )


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("data_root")
    parser.add_argument("--epochs", type=int, default=60)
    parser.add_argument("--batch-size", type=int, default=32)
    parser.add_argument("--lr", type=float, default=1e-3)
    parser.add_argument("--patience", type=int, default=10, help="early-stopping patience")
    parser.add_argument("--out", default="shot_classifier")
    parser.add_argument("--seed", type=int, default=42)
    args = parser.parse_args()

    import torch
    import torch.nn as nn

    torch.manual_seed(args.seed)
    np.random.seed(args.seed)
    rng = random.Random(args.seed)

    print("Loading dataset ...")
    clips, labels, class_names = load_dataset(args.data_root)
    if len(set(labels)) < 2:
        sys.exit("Need at least 2 classes with clips.")
    tr_idx, va_idx, te_idx = stratified_split(labels, seed=args.seed)
    print(f"Split by video: train={len(tr_idx)} val={len(va_idx)} test={len(te_idx)}")

    def tensorize(indices, augment_n=0):
        xs, ys = [], []
        for i in indices:
            xs.append(preprocess(clips[i]))
            ys.append(labels[i])
            for _ in range(augment_n):
                aug_seq, aug_label = augment(clips[i], labels[i], class_names, rng)
                xs.append(preprocess(aug_seq))
                ys.append(aug_label)
        x = torch.tensor(np.stack(xs)).permute(0, 2, 1)  # (B, 99, 48)
        return x, torch.tensor(ys)

    x_tr, y_tr = tensorize(tr_idx, augment_n=3)
    x_va, y_va = tensorize(va_idx)
    x_te, y_te = tensorize(te_idx)

    device = "cuda" if torch.cuda.is_available() else "cpu"
    model = build_model(len(class_names)).to(device)
    opt = torch.optim.AdamW(model.parameters(), lr=args.lr, weight_decay=1e-4)
    loss_fn = nn.CrossEntropyLoss()

    best_val, best_state, bad_epochs = float("inf"), None, 0
    n = len(x_tr)
    for epoch in range(args.epochs):
        model.train()
        perm = torch.randperm(n)
        total = 0.0
        for b in range(0, n, args.batch_size):
            idx = perm[b: b + args.batch_size]
            xb, yb = x_tr[idx].to(device), y_tr[idx].to(device)
            opt.zero_grad()
            loss = loss_fn(model(xb), yb)
            loss.backward()
            opt.step()
            total += loss.item() * len(idx)
        model.eval()
        with torch.no_grad():
            val_loss = loss_fn(model(x_va.to(device)), y_va.to(device)).item()
        print(f"epoch {epoch + 1:3d}  train_loss {total / n:.4f}  val_loss {val_loss:.4f}")
        if val_loss < best_val - 1e-4:
            best_val, best_state, bad_epochs = val_loss, model.state_dict(), 0
        else:
            bad_epochs += 1
            if bad_epochs >= args.patience:
                print(f"Early stopping at epoch {epoch + 1} (best val_loss {best_val:.4f})")
                break
    if best_state:
        model.load_state_dict(best_state)

    # ── Test metrics: accuracy + per-class confusion matrix ────────────────
    model.eval()
    with torch.no_grad():
        preds = model(x_te.to(device)).argmax(dim=1).cpu()
    acc = (preds == y_te).float().mean().item()
    print(f"\nTEST ACCURACY: {acc * 100:.1f}%  ({len(y_te)} clips)")
    k = len(class_names)
    conf = np.zeros((k, k), dtype=int)
    for t, p in zip(y_te.tolist(), preds.tolist()):
        conf[t][p] += 1
    width = max(len(c) for c in class_names)
    print("\nConfusion matrix (rows = truth, cols = predicted):")
    print(" " * (width + 2) + "  ".join(f"{i:>4d}" for i in range(k)))
    for i, cls in enumerate(class_names):
        print(f"{cls:>{width}}  " + "  ".join(f"{v:>4d}" for v in conf[i]))
    for i, cls in enumerate(class_names):
        print(f"  [{i}] {cls}")
    if acc < 0.80:
        print("\n⚠️  Below the 80% ship gate — keep the classifier behind ?experimental=1.")

    # ── Export ──────────────────────────────────────────────────────────────
    torch.save(
        {"state_dict": model.state_dict(), "class_names": class_names}, f"{args.out}.pt"
    )
    model_cpu = model.to("cpu").eval()
    dummy = torch.zeros(1, N_FEATURES, SEQ_LEN)
    torch.onnx.export(
        model_cpu, dummy, f"{args.out}.onnx", opset_version=17,
        input_names=["landmarks"], output_names=["logits"],
        dynamic_axes={"landmarks": {0: "batch"}},
    )
    size_mb = os.path.getsize(f"{args.out}.onnx") / 1e6
    print(f"\nSaved {args.out}.pt and {args.out}.onnx ({size_mb:.2f} MB)")

    # ONNX/PyTorch parity check on up to 10 test samples.
    import onnxruntime as ort

    sess = ort.InferenceSession(f"{args.out}.onnx")
    sample = x_te[:10].numpy()
    with torch.no_grad():
        torch_out = model_cpu(torch.tensor(sample)).numpy()
    onnx_out = sess.run(None, {"landmarks": sample})[0]
    max_diff = float(np.abs(torch_out - onnx_out).max())
    print(f"ONNX parity max |Δ| on {len(sample)} samples: {max_diff:.2e} "
          f"({'OK' if max_diff < 1e-4 else 'FAILED — investigate before shipping'})")

    print(f"\nClass names (index order for the frontend): {class_names}")
    print(f"Copy {args.out}.onnx to public/models/ for in-browser inference.")


if __name__ == "__main__":
    main()
