# File Upload Pipeline — Profile Photos

## Full Pipeline (in order)

```
Client                          Server
──────                          ──────
1. User selects file
2. resizeImage() client-side    ← max 1024px, converts to PNG blob
3. POST /api/settings/profile-image-upload
   FormData { image: blob }
                                4. multer memoryStorage → req.file.buffer
                                5. @imgly removeBackground(blob)
                                   ← pass raw req.file.buffer, ZERO pre-processing
                                6. sharp(result).trim().png() → processedBuffer
                                   ← strips transparent edges only
                                7. uploadImage(processedBuffer, 'profiles', 'image/png', 1024)
                                   ← sharp resize to 1024px width
                                   ← sharp .webp({ quality: 82 })
                                   ← upload to Cloudflare R2
                                8. UPDATE users SET profileImageUrl = r2Url
                                9. Return { imageUrl, user }
10. queryClient.invalidateQueries(['/api/auth/user'])
11. img renders with object-contain object-center
```

## Key Rules

**Backend pre-processing**: NONE before `removeBackground()`.
The `@imgly` model is trained on natural photos. Any normalize/clahe/modulate/linear/sharpen before it confuses the segmentation model and produces grainy artifacts. Learned the hard way (commit `18d5704` broke it, `ed238d0` reverted).

**After BG removal**: Only `.trim().png()` — strips transparent edges. No canvas resize, no composite. Let CSS handle positioning.

**Frontend display** (`MobileHero.tsx`):

- Photo zone: `absolute right-0 top-0 bottom-0 w-[42%] lg:w-[46%] overflow-hidden`
- Image: `w-full h-full object-contain object-center`
- `object-contain` preserves aspect ratio, `object-center` centers within the zone.

**Fallback** (no R2 configured): base64 data URL stored directly in DB. Acceptable for dev; not for production.

**BG removal failure**: `catch (bgError)` uses original buffer unchanged — upload proceeds with original photo. Error logged to console.

## Files

- `client/src/components/redesign/dashboard/MobileHero.tsx` — photo zone + img tag
- `server/routes/settings.ts` — upload route (POST `/api/settings/profile-image-upload`)
- `server/services/fileUpload.ts` — `uploadImage()`, `deleteImage()`, `isR2Configured()`

## Related Notes

- [[stack-backend]]
- [[gotchas]]
