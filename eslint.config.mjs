import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,

  // specs/001-route-map.md §7 — the workspace must never import the marketing
  // components. That import is the first symptom of the workspace drifting
  // toward looking like a landing page, and it is also what would let the
  // landing-only `--accent` exception (specs/002 §3.10) escape into the app.
  {
    files: [
      "app/(app)/**/*.{ts,tsx}",
      "components/dashboard/**/*.{ts,tsx}",
      "components/workflow/**/*.{ts,tsx}",
      "components/settings/**/*.{ts,tsx}",
      "components/shared/**/*.{ts,tsx}",
      "components/settings/**/*.{ts,tsx}",
      "stores/**/*.{ts,tsx}",
    ],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["@/components/marketing/*", "**/components/marketing/*"],
              message:
                "specs/001-route-map.md §7: (app) must never import components/marketing/.",
            },
          ],
        },
      ],
    },
  },

  // CLAUDE.md rule 2 — `sendPackage` is reachable ONLY from the Review screen.
  //
  // `no-restricted-imports` cannot express this. `api` is what gets imported
  // and `sendPackage` is a method on it, so nothing forbidden ever appears in
  // an import statement. Matching the member access is the only way to catch
  // it, which is why this rule is a selector rather than a path.
  //
  // The workflow. Every step except Review, plus everything shared between
  // them: the stepper, StepShell, JobProgressCard, AIEditableField. A send
  // button on a shared component would appear on all six steps at once.
  {
    files: [
      "components/workflow/**/*.{ts,tsx}",
      "app/(app)/(focus)/**/*.{ts,tsx}",
    ],
    ignores: [
      "**/*.test.{ts,tsx}",
      // The one screen rule 2 permits, and the ONLY entry this list may ever
      // have. Adding a second is the rule being broken, not configured.
      "components/workflow/steps/ReviewStep.tsx",
    ],
    rules: {
      "no-restricted-syntax": [
        "error",
        {
          selector: "MemberExpression[property.name='sendPackage']",
          message:
            "specs/007-workflow.md §3.2: sending happens only from the Review step (CLAUDE.md rule 2). A Server Action is not an alternative — it is a POST endpoint reachable without rendering Review.",
        },
      ],
    },
  },

  // Settings. Nothing here sends anything — it configures what a send will
  // use. specs/008 §4 says that should hold by construction rather than by
  // nobody having tried it.
  {
    files: [
      "app/(app)/(shell)/settings/**/*.{ts,tsx}",
      "components/settings/**/*.{ts,tsx}",
    ],
    ignores: ["**/*.test.{ts,tsx}"],
    rules: {
      "no-restricted-syntax": [
        "error",
        {
          selector:
            "MemberExpression[property.name=/^(sendPackage|deletePreset)$/]",
          message:
            "specs/008-settings.md: Settings configures what a send uses and never performs one (CLAUDE.md rule 2). `deletePreset` does not exist either — presets are archived, because a sent package references them (§3.3).",
        },
      ],
    },
  },

  // Override default ignores of eslint-config-next.
  globalIgnores([".next/**", "out/**", "build/**", "next-env.d.ts"]),
]);

export default eslintConfig;
