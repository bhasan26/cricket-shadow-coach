# Contributing

## Secrets

Never commit API tokens, keys, or credentials — not even in example code or
notebooks. Load them from environment variables (Colab: use the Secrets panel).

Before committing, run a secret scan:

```bash
# Install once: brew install gitleaks
gitleaks protect --staged
```

Optionally wire it up as a pre-commit hook:

```bash
echo 'gitleaks protect --staged' > .git/hooks/pre-commit
chmod +x .git/hooks/pre-commit
```

A Kaggle token was once committed here; it has been revoked and scrubbed from
history. Don't be the sequel.

## Large files

Do not commit model weights, videos, or images over ~1 MB. Publish model files
as GitHub Release assets (or Git LFS) and reference them from the README.
