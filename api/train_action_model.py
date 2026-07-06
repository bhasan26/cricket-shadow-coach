"""
Cricket Bowling Action Recognition - Google Colab Training Script

INSTRUCTIONS FOR GOOGLE COLAB:
1. Go to https://colab.research.google.com/
2. Click "Upload" and upload this file.
3. In the top menu, click Runtime -> Change Runtime Type -> select "T4 GPU".
4. Add your Kaggle API credentials to download the dataset.
5. Run the cells to train the model.
6. Download the resulting 'bowling_model.pt' file to your local machine!
"""

import os
import torch
import torch.nn as nn
import torchvision.models as models
from torch.utils.data import DataLoader, Dataset
import cv2
import numpy as np

# 1. DOWNLOAD DATASET FROM KAGGLE
# (Run this in a Colab notebook cell)
# Set your Kaggle token via Colab secrets (key icon in the left sidebar → add
# "KAGGLE_API_TOKEN"), or export it in your environment. Never hardcode it here.
os.environ['KAGGLE_API_TOKEN'] = os.environ.get("KAGGLE_API_TOKEN", "")

!pip install kaggle
!kaggle datasets download -d bigyansubedi/cricket-bowling-action-recognition
!unzip -q -o cricket-bowling-action-recognition.zip -d dataset/

class VideoDataset(Dataset):
    def __init__(self, video_dir, transform=None, num_frames=16):
        self.video_dir = video_dir
        # Assumes dataset has subfolders for each class (e.g., 'legal', 'illegal', 'spin', 'pace')
        # Sort classes alphabetically to ensure consistent class-to-index mapping between training and inference
        self.classes = sorted([d for d in os.listdir(video_dir) if os.path.isdir(os.path.join(video_dir, d))])
        self.video_paths = []
        self.labels = []
        
        for idx, cls in enumerate(self.classes):
            cls_dir = os.path.join(video_dir, cls)
            for vid in os.listdir(cls_dir):
                # Skip hidden files
                if not vid.startswith('.'):
                    self.video_paths.append(os.path.join(cls_dir, vid))
                    self.labels.append(idx)
                    
        self.num_frames = num_frames

    def __len__(self):
        return len(self.video_paths)

    def __getitem__(self, idx):
        path = self.video_paths[idx]
        label = self.labels[idx]
        
        # Read video frames
        cap = cv2.VideoCapture(path)
        frames = []
        while cap.isOpened():
            ret, frame = cap.read()
            if not ret:
                break
            frame = cv2.resize(frame, (224, 224))
            frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
            frames.append(frame)
        cap.release()
        
        # Sample exactly 'num_frames' frames uniformly
        if len(frames) == 0:
            return torch.zeros(self.num_frames, 3, 224, 224), label
            
        indices = np.linspace(0, len(frames)-1, self.num_frames, dtype=int)
        sampled_frames = [frames[i] for i in indices]
        
        # Convert to tensor [T, C, H, W]
        tensor_frames = torch.FloatTensor(np.array(sampled_frames)).permute(0, 3, 1, 2) / 255.0
        return tensor_frames, label

# 2. DEFINE THE AI MODEL (CNN + LSTM for Video)
class BowlingActionModel(nn.Module):
    def __init__(self, num_classes):
        super(BowlingActionModel, self).__init__()
        # Use MobileNetV2 as a lightweight feature extractor for each frame
        resnet = models.mobilenet_v2(weights=models.MobileNet_V2_Weights.DEFAULT)
        self.feature_extractor = resnet.features
        self.pool = nn.AdaptiveAvgPool2d((1, 1))
        
        # Freeze the feature extractor to save massive amounts of GPU memory
        for param in self.feature_extractor.parameters():
            param.requires_grad = False
        self.feature_extractor.eval()
        
        # LSTM to analyze the sequence of frames over time
        self.lstm = nn.LSTM(1280, 256, batch_first=True)
        self.classifier = nn.Linear(256, num_classes)

    def train(self, mode=True):
        super(BowlingActionModel, self).train(mode)
        # Always keep the feature extractor in eval mode so Batch Normalization 
        # layers use pre-trained ImageNet statistics and don't get corrupted
        self.feature_extractor.eval()
        return self

    def forward(self, x):
        batch_size, time_steps, C, H, W = x.size()
        
        # Extract features for each frame
        c_in = x.reshape(batch_size * time_steps, C, H, W)
        
        # No gradients needed for frozen feature extractor
        with torch.no_grad():
            features = self.feature_extractor(c_in)
            features = self.pool(features)
            features = features.reshape(features.size(0), -1) # Flatten
        
        # Pass sequence to LSTM
        lstm_in = features.reshape(batch_size, time_steps, -1)
        lstm_out, _ = self.lstm(lstm_in)
        
        # Classify the final output state of the video
        final_state = lstm_out[:, -1, :]
        return self.classifier(final_state)

# 3. TRAINING LOOP
def train_model():
    print("Initializing dataset...")
    # Change 'dataset/' to the actual path of the extracted Kaggle dataset
    dataset = VideoDataset("dataset/") 
    # Reduced batch size to 4 to prevent CUDA OOM
    loader = DataLoader(dataset, batch_size=4, shuffle=True)
    
    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    print(f"Training on: {device}")
    
    # Clear CUDA cache before training to free fragmented memory
    if torch.cuda.is_available():
        torch.cuda.empty_cache()
    
    model = BowlingActionModel(num_classes=len(dataset.classes)).to(device)
    criterion = nn.CrossEntropyLoss()
    optimizer = torch.optim.Adam(model.parameters(), lr=0.001)
    
    # Checkpoint Configuration
    # To persist checkpoints across Colab session disconnects, mount Google Drive:
    # from google.colab import drive
    # drive.mount('/content/drive')
    # checkpoint_path = "/content/drive/MyDrive/bowling_model_checkpoint.pt"
    checkpoint_path = "bowling_model_checkpoint.pt"
    start_epoch = 0
    epochs = 10
    
    if os.path.exists(checkpoint_path):
        print(f"Found existing checkpoint at {checkpoint_path}. Resuming training...")
        try:
            checkpoint = torch.load(checkpoint_path, map_location=device)
            model.load_state_dict(checkpoint['model_state_dict'])
            optimizer.load_state_dict(checkpoint['optimizer_state_dict'])
            start_epoch = checkpoint['epoch']
            print(f"Successfully resumed from epoch {start_epoch}")
        except Exception as e:
            print(f"Could not load checkpoint: {e}. Starting from scratch.")
    
    print("Starting training loop...")
    for epoch in range(start_epoch, epochs):
        model.train()
        total_loss = 0
        for videos, labels in loader:
            videos, labels = videos.to(device), labels.to(device)
            
            optimizer.zero_grad()
            outputs = model(videos)
            loss = criterion(outputs, labels)
            loss.backward()
            optimizer.step()
            
            total_loss += loss.item()
            
        print(f"Epoch {epoch+1}/{epochs} | Loss: {total_loss/len(loader):.4f}")
        
        # Save checkpoint at the end of every epoch
        torch.save({
            'epoch': epoch + 1,
            'model_state_dict': model.state_dict(),
            'optimizer_state_dict': optimizer.state_dict(),
            'loss': total_loss/len(loader),
        }, checkpoint_path)
        print(f"Epoch {epoch+1} checkpoint saved to {checkpoint_path}")
        
    # 4. SAVE FINAL EXPORTED MODEL
    torch.save(model.state_dict(), "bowling_model.pt")
    print("Training complete! Final model saved as 'bowling_model.pt'.")

if __name__ == "__main__":
    train_model()
