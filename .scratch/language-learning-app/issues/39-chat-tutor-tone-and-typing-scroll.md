# 39: Chat tutor tone and typing scroll

**Problem:** In chat mode the tutor writes long, eloquent replies that pack several questions into one message, so they are hard to answer in one go. It also uses the target phrases itself, so using them back sounds awkward. After sending, the list does not scroll to the typing indicator, so it is unclear anything is happening.

**Decisions:**
- Opener and reply: 1–2 short sentences, about 25 words at most, at most one question per message.
- Light steering: targets stay in the prompts, and the tutor keeps the talk on topics where they could fit. It never pushes toward a specific phrase.
- The tutor never says a target phrase or a close variant of one. This is enforced in the prompt only, with no server check or retry.
- Reply prompt: the target section is dropped when there are no targets, the same as the opener.
- The message list is inverted, so it stays pinned to the bottom. The last item (bubble, typing indicator or reply) is always the same distance above the composer: while typing, after sending, and when the reply arrives or the keyboard opens.

**Out of scope:** assessment prompt, drills, server-side phrase detection.

- [ ] api tests: both tutor prompts carry the length/one-question rule and the never-use-targets rule; reply prompt drops its target section when there are no targets.
- [ ] app: after send, the typing indicator is scrolled into view, verified in the iPhone 13 Pro sim.
- [ ] Manual: a local chat session gives short replies with one question and never uses a target phrase.
