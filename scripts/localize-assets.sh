#!/usr/bin/env bash
# Downloads the hosted Higgsfield media into public/assets/media/ and points the pages and scripts at the local copies.
# Run from the repo root on any machine with normal internet access.
set -euo pipefail
cd "$(dirname "$0")/.."
mkdir -p public/assets/media
CDN="https://d2ol7oe51mr4n9.cloudfront.net/user_2vgr4LDcTnBdquYG4fMZ396AWcW"
declare -A FILES=(
  [d7382d63-0629-4e84-a154-32250d837424.mp4]=hero.mp4
  [223108b7-727b-4f95-83b3-b35e44c577ba.jpg]=hero-poster.jpg
  [e0436c03-172d-45eb-bae4-3ea299f695e0.mp4]=verdict.mp4
  [b57eea6f-5f82-46d5-b394-950587677b76.jpg]=verdict-poster.jpg
  [83599bbc-73e5-49fc-9d23-e2025bdcb852.webp]=world-restoration-medical.webp
  [3d266ebf-aafe-43c9-a611-071e4fa225d5.webp]=world-black-lotus-coffee.webp
  [f9f4237f-3a1c-4d7b-970d-325e798efbcc.webp]=world-castleblack-spirits.webp
  [2c1fbed2-57af-403d-aba0-96e21e6f1312.webp]=world-toronto-beauty.webp
  [d7cffe34-9afd-4d03-baed-1ff5c1e4e99c.webp]=world-lorelyns-gourmet-desserts.webp
  [eb66760c-d16c-43f8-976d-74c89aec4849.webp]=world-rum-raiders-ring.webp
  [51ffa9fe-d28d-4fa4-bb61-b1540ff3786f.webp]=world-lisa-dang-immigration-law.webp
  [56012ed1-e8d9-41cf-853e-77e2d0d5a243.webp]=world-wellfit-social-club.webp
  [29af57a6-44b4-4eec-9e05-c384387b9add.webp]=world-art-colouring.webp
  [e564eff6-2de7-4e88-84f5-b03eac1f5342.mp4]=hero-scrub.mp4
  [850eb902-d4a5-424e-a6cc-84a3ba62df2b.mp4]=film-restoration-medical.mp4
  [9bc2161b-3fbe-4d64-9aa9-a550d24089dd.mp4]=film-black-lotus-coffee.mp4
  [855d452e-bd6f-46b8-9a09-a593c1dd1f1a.mp4]=film-castleblack-spirits.mp4
  [9b9465fa-41d8-471f-a259-18a3fc986ee6.mp4]=film-toronto-beauty.mp4
  [bbc35de0-9c24-4720-b5e1-b2a367da6c03.mp4]=film-lorelyns.mp4
  [eb0e5300-7279-422e-a9a3-9f34c33f7b67.mp4]=film-lisa-dang-immigration-law.mp4
  [7e9912bd-d83f-470c-9145-8b3ebac372e0.mp4]=film-rum-raiders-ring.mp4
  [ca2b8fca-641f-4227-a88b-a10c499ed6ce.mp4]=film-wellfit-social-club.mp4
  [7b34d099-139f-435c-852a-70ac56491274.mp4]=film-art-colouring.mp4
  [27a2a3ee-1760-4bb5-b106-8b65b6463c38.jpg]=seal-poster.jpg
  [d4e937c0-f30b-45bb-97dd-221d1e97c2b5.webp]=work-rum-raiders-ring-1.webp
  [0c64305d-1a91-46e5-80b1-5d1f9d70c81e.webp]=work-rum-raiders-ring-2.webp
  [437ca3cf-3ebd-44f8-a531-2a25704182bf.webp]=work-rum-raiders-ring-3.webp
  [f6781d26-d4a9-46cc-a870-db9899e39e35.webp]=work-rum-raiders-ring-4.webp
  [c6aa4783-3ed2-4978-a660-0c0610424a19.webp]=work-rum-raiders-ring-5.webp
  [8f2c274b-d49c-4390-8755-f11a0a74c0e8.webp]=work-lisa-dang-1.webp
  [decd1905-4609-4c73-bd31-5a5c817edb50.webp]=work-lisa-dang-2.webp
  [73bcbd63-efa2-4444-8935-9b23c1186c59.mp4]=seal.mp4
)
for src in "${!FILES[@]}"; do
  dest="public/assets/media/${FILES[$src]}"
  curl -fsSL -o "$dest" "$CDN/$src"
  grep -rl "$src" src public/assets/js | xargs -r sed -i.bak "s#$CDN/$src#/assets/media/${FILES[$src]}#g"
  echo "saved $dest"
done
find . -name "*.bak" -delete
echo "Done. Pages and scripts now use local media."
