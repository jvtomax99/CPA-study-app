# Study buddy: prompts for his faces

(The faces in this folder were made from the original full-figure render instead of
`reference.png`; that worked better, since it is the picture the bust was cut from. Use it
for new faces too.)

Same method as Dr. Smiley's faces (Interp, `docs/art/dr-smiley-faces/`).
Use an image tool that edits a picture you upload (ChatGPT image editing,
Gemini, or similar). For every prompt, upload `reference.png` first (the
buddy from `art/buddy-bust.webp` on white, 960 x 1200). Make one face per
request, in a new chat each time, so earlier results don't drift into it.

Keep a result only if, laid over the reference, his head, cap, hair and
glasses sit in the same place at the same size. Check the glasses most:
image tools like to redraw the round frames, and a frame that moved or
changed thickness can't be used. If it moved, ask again.

## The opening (paste this before each face)

Edit this image. Keep everything identical: the same character, head
position, head size, angle, framing, green cap, hair, ears, nose, cheeks,
skin tones, lighting, the round black glasses (same frames, same size,
same position, same thickness), eyebrows, jacket, pencil, calculator and
the plain white background. Do not move, zoom, crop, tilt or redraw the
head or the glasses. Change ONLY the eyes (lids, irises, pupils) and the
mouth, as described below. The eyes stay behind the same lenses. Same 3D
cartoon style, same render quality. Output the same size and aspect ratio
(4:5).

## 1. Lids a third down (blink, first step)
Upper eyelids lowered to cover the top third of the irises, as in the
start of a blink. Irises looking the same way as in the reference. Mouth
exactly as in the reference.

## 2. Lids two thirds down (blink, second step)
Upper eyelids lowered to cover two thirds of the irises, as in the middle
of a blink. Mouth exactly as in the reference.

## 3. Eyes shut
Both eyes gently closed, upper lids all the way down, lashes resting,
relaxed, not squeezed. Mouth exactly as in the reference.

## 4. Wink
His left eye (on the right of the picture) closed in a playful wink, the
lid curved, the cheek under it lifted a little. The other eye open as in
the reference. Mouth a slightly bigger closed smile, pulled a touch
toward the winking side.

## 5. Smile, lips parting
Eyes as in the reference, lower lids lifted a little by the cheeks. Mouth
a wider smile, lips just parted, a thin line of upper teeth showing.

## 6. Big smile
Eyes a little narrowed by raised cheeks, still open. Mouth a wide open
smile, upper teeth showing, a little tongue at the bottom, corners high.

## 7. Laugh
Eyes squeezed shut into happy upturned arcs. Mouth wide open in a laugh,
upper teeth and tongue showing, cheeks raised and round.

## 8. Surprised
Eyes wide open, upper lids raised so white shows all around the irises,
pupils a little smaller, looking straight at the viewer. Mouth a small,
round open "O", lips relaxed, a dark inside.

## 9. Encouraging
Eyes soft and kind, looking straight at the viewer, upper lids very
slightly lowered. Mouth a small warm closed smile with the corners pressed
in, a gentle "you'll get it next time" look. Not sad.

## 10. Doubtful
His left eye (on the right of the picture) squinted half closed, the other
eye open normally, looking at the viewer. Mouth closed, pulled to one side
(toward the picture's right), a small knowing smirk, as in "lucky guess".

## 11. Asleep
Both eyes closed, peaceful, lids relaxed and slightly heavy. Mouth
relaxed and a little open, a small dark gap, as in quiet sleep.

## Not needed

Looking left and right, up and down: made from the reference by moving
his irises inside the drawn eye openings, as with Dr. Smiley's eight
gazes. Brows: cut from the reference as their own pieces and moved in
code, so whatever the tool does to them is ignored.

## After

Save each result as `NN-name.png` (`01-blink1.png` ... `11-sleep.png`) and
drop them in this folder. Then the eyes and mouth get cut from each one
inside the face window, matched in colour to the calm face, and packed
into one frame strip, the way Dr. Smiley's faces were (see his README).
