# Committed PR media

Media committed here is referenced from pull-request descriptions as clickable
markdown **links** (to each file's GitHub blob view), so a reviewer can open the
screenshot even on PRs opened through the GitHub API or the CLI — where
drag-and-drop upload isn't available and inline image embeds get stripped by the
posting layer. Inline rendering is only possible when a human drags a file into
the web PR editor.

Use `node scripts/pr-media.mjs <file...>` to drop screenshots in here and print
the ready-to-paste markdown links. See docs/AGENT_BUILD.md and the PR template.
