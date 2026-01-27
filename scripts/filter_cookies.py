#!/usr/bin/env python3
"""
Filter a Netscape-format cookies.txt keeping only entries matching specified domains.

Usage:
  python3 filter_cookies.py <infile> [--out outfile] [--domains comma,separated]

If --out not provided, the input file is overwritten atomically.
"""
import argparse
from pathlib import Path
import tempfile
import shutil
import sys


def parse_args():
    p = argparse.ArgumentParser(description="Filter Netscape cookies.txt by domains")
    p.add_argument("infile", help="Input cookies file (Netscape format)")
    p.add_argument("--out", help="Output file (defaults to overwrite infile)")
    p.add_argument("--domains", default="youtube.com,youtube-nocookie.com,googlevideo.com,google.com",
                   help="Comma-separated domains to keep (default: youtube + related)")
    return p.parse_args()


def keep_line(line: str, domains):
    # Keep comment or blank lines
    s = line.strip()
    if not s or s.startswith('#'):
        return True
    parts = s.split('\t')
    if len(parts) < 7:
        return False
    domain = parts[0].lstrip('.')
    for d in domains:
        if d in domain:
            return True
    return False


def main():
    args = parse_args()
    infile = Path(args.infile)
    if not infile.exists():
        print(f"Input file not found: {infile}", file=sys.stderr)
        sys.exit(2)
    outpath = Path(args.out) if args.out else infile
    domains = [d.strip() for d in args.domains.split(',') if d.strip()]

    with infile.open('r', encoding='utf-8', errors='ignore') as f:
        lines = f.readlines()

    kept = [l for l in lines if keep_line(l, domains)]

    # write atomically
    if outpath == infile:
        fd, tmp = tempfile.mkstemp(dir=str(infile.parent))
        tmpf = Path(tmp)
        try:
            with tmpf.open('w', encoding='utf-8') as f:
                f.writelines(kept)
            shutil.move(str(tmpf), str(infile))
        finally:
            try:
                if tmpf.exists():
                    tmpf.unlink()
            except Exception:
                pass
    else:
        outpath.parent.mkdir(parents=True, exist_ok=True)
        with outpath.open('w', encoding='utf-8') as f:
            f.writelines(kept)

    print(f"Filtered cookies written to {outpath} (kept {len(kept)} lines)")


if __name__ == '__main__':
    main()
