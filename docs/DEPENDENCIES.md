# Python dependency maintenance

Use Python 3.12. Every `.txt` profile is generated from its matching `.in` input
and contains exact versions and hashes for the complete dependency graph.
Install one profile in a clean virtual environment:

```bash
cd api
python3.12 -m venv .venv
source .venv/bin/activate
pip install --require-hashes --no-deps -r requirements-test.txt
pip check
```

| Profile | Use |
| --- | --- |
| `requirements.txt` | FastAPI/scoring runtime, including contact delivery |
| `requirements-test.txt` | Runtime + pytest, HTTPX, Ruff; used by CI |
| `requirements-dev.txt` | Test profile + legacy MediaPipe reference capture |
| `requirements-full.txt` | Runtime + OpenCV/Ultralytics for optional ball tracking |

Legacy reference capture uses `mp.solutions.pose`, so its MediaPipe version is
held at 0.10.21. NumPy 1.26.4 is shared with the runtime to keep this profile
compatible. Reference capture uses the contrib OpenCV distribution required by
MediaPipe; the optional ball-tracking profile uses regular OpenCV. Use separate
environments for these two profiles to avoid overlapping `cv2` installations.
The full profile includes substantial PyTorch dependencies; it is intended for
containers, rather than Vercel's lightweight runtime. The Dockerfile supplies
OpenCV's Linux shared libraries. Native hosts also need those system libraries.

## Update locks

Edit direct dependencies in `.in` files, then compile in this order from `api/`.
The locks were generated with uv 0.11.15. Constraints keep shared packages at the
runtime/test versions. `--universal` includes platform-specific dependency markers.

```bash
uv pip compile requirements.in --python-version 3.12 --universal --generate-hashes --output-file requirements.txt
uv pip compile requirements-test.in --python-version 3.12 --universal --generate-hashes --constraint requirements.txt --output-file requirements-test.txt
uv pip compile requirements-dev.in --python-version 3.12 --universal --generate-hashes --constraint requirements-test.txt --output-file requirements-dev.txt
uv pip compile requirements-full.in --python-version 3.12 --universal --generate-hashes --constraint requirements.txt --output-file requirements-full.txt
```

Existing locks preserve previously resolved versions unless inputs force a
change. Use `--upgrade-package PACKAGE` for an intentional update, or `--upgrade`
to refresh the whole graph. Review the resulting diff and install each affected
profile in a fresh environment with hash verification and `pip check`.
Run `python -m ruff check .`, `python -m pytest tests -q`, and
`python -m eval.run_eval` under the test profile. Changes to optional CV packages
also need a smoke test of their actual capture/tracking workflow on the target
platform; resolving a lock alone does not validate those workflows.

The current runtime/test lock has been installed in an isolated Python 3.12
environment and used for the backend tests and scoring evaluation. The optional
CV profiles have been resolved, but their heavy model workflows have not been
run as part of the contact-form change.

References: [uv compile](https://docs.astral.sh/uv/pip/compile/) and
[pip repeatable installs](https://pip.pypa.io/en/stable/topics/repeatable-installs/).
