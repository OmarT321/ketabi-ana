# Release status

This repository is an engineering preview of «كتابي أنا» (Kitabi Ana). It was separated from a repository shared with another project; see [NOTICE](../NOTICE). No deployment from this repository has been made or verified.

## Gates for an approved release

1. **Scholarly approval.** All 15 lessons and the authored story texts are `pending`. No reviewer identity or date has been invented. Mappings, meanings, questions and illustrations need named human review before `CONTENT_MODE=reviewed`.
2. **Reviewed story edition.** The fictional story edition is preview-only. In reviewed mode, book creation is blocked until a reviewed story release exists.
3. **Evaluation.** There is no child comparison study, independent labelling, or clinical validation of the crisis handling. Automated tests are regressions, not efficacy claims.
4. **AI.** `AI_ENABLED` and `AI_IMAGES_ENABLED` stay `false`. Live generation, latency, cost and moderation have not been verified with a provider.
5. **Data rights.** Confirm Quran Foundation and sunnah.com terms for production use (see [SOURCES.md](SOURCES.md)).
6. **Infrastructure.** Create your own Supabase and Vercel projects and verify the quota service and approval invalidation live.
