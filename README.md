# Dars (دَرْس)

An Arabic vocabulary learning app with interactive quizzes, flashcard carousels, and full Bengali/English localization.

## Getting Started

```bash
bun install
bun run dev
```

## Scripts

| Command           | Description                                        |
| ----------------- | -------------------------------------------------- |
| `bun run dev`     | Start dev server on port 3000                      |
| `bun run build`   | Validate messages + production build               |
| `bun run preview` | Preview production build locally                   |
| `bun run check`   | Run all checks (validate, typecheck, format, lint) |
| `bun run deploy`  | Deploy to Cloudflare Workers                       |
| `bun run test`    | Run tests                                          |

## Stack

- [TanStack Start](https://tanstack.com/start) — SSG with file-based routing
- [Paraglide JS](https://inlang.com/m/gerre34r/library-inlang-paraglideJs) — i18n with URL-based locale strategy
- [Tailwind CSS](https://tailwindcss.com/) — styling
- [Cloudflare Workers](https://workers.cloudflare.com/) — static hosting

## License

This project is licensed under the [GNU Affero General Public License v3.0](LICENSE).
