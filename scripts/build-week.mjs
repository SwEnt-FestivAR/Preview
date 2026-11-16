// Turns one capture run into a week of the demo site, kept in the history folder (the `data` branch):
//   shots/<sha1>.png   every distinct image ever captured (unchanged images are stored once)
//   weeks/<id>.json    what the site shows for that week
//   index.json         list of the weeks
// Usage: node scripts/build-week.mjs --captures <dir> --previews <previews.json> --history <dir>
//          [--date <ISO date, default now>] [--commit <sha>]
// Env: GITHUB_TOKEN (optional, for the merged PRs of the week)
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { PNG } from 'pngjs';

