import re
import os

with open('index.html', 'r', encoding='utf-8') as f:
    html = f.read()

style_match = re.search(r'<style>(.*?)</style>', html, re.DOTALL)
script_match = re.search(r'<script>(.*?)</script>', html, re.DOTALL)

if style_match:
    with open('style.css', 'w', encoding='utf-8') as f:
        f.write(style_match.group(1))
    html = html.replace(style_match.group(0), '<link rel="stylesheet" href="style.css">')

if script_match:
    with open('app.js', 'w', encoding='utf-8') as f:
        f.write(script_match.group(1))
    html = html.replace(script_match.group(0), '<script src="qr-renderer.js"></script>\n<script src="app.js"></script>')

with open('index.html', 'w', encoding='utf-8') as f:
    f.write(html)
