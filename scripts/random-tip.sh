#!/usr/bin/env bash
tips=(
  "Review new words within 24 hours to beat the forgetting curve."
  "Say new vocabulary out loud, not just in your head."
  "Learn words in short phrases, not isolation."
  "Five minutes daily beats one hour weekly."
  "Mix listening practice in with flashcards."
)
echo "${tips[$RANDOM % ${#tips[@]}]}"
