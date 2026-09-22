#!/bin/sh
# Publish OSV scan results as a Bitbucket Code Insights report + annotations
# on the commit being built, so findings show up in the PR's Reports panel.
# Only works inside Bitbucket Pipelines: uses the auth-free localhost:29418
# proxy to api.bitbucket.org for the current commit.
# Usage: sh scripts/publish-osv-code-insights.sh [osv-results.json]
set -eu

RESULTS_JSON="${1:-osv-results.json}"
# Must be http, not https: the pipeline proxy injects auth into the request,
# which it can only do when it can read it (https would tunnel straight through).
API="http://api.bitbucket.org/2.0/repositories/${BITBUCKET_REPO_FULL_NAME}/commit/${BITBUCKET_COMMIT}"
PROXY="localhost:29418"

# Unique vulnerabilities with their severity (GHSA MODERATE -> MEDIUM, default MEDIUM)
jq '[.results[]?.packages[]?.vulnerabilities[]?
     | {id, sev: (((.database_specific.severity // "MEDIUM") | ascii_upcase)
                  | if . == "MODERATE" then "MEDIUM" else . end)}]
    | unique_by(.id)' "$RESULTS_JSON" > /tmp/osv-vulns.json

TOTAL=$(jq length /tmp/osv-vulns.json)
if [ "$TOTAL" -eq 0 ]; then RESULT=PASSED; else RESULT=FAILED; fi

jq --arg result "$RESULT" '{
  title: "OSV vulnerability scan",
  details: "Known vulnerabilities in dependency lockfiles, checked against OSV.dev. Report-only: does not block the build. Full results in the pipeline artifacts.",
  report_type: "SECURITY",
  reporter: "osv-scanner",
  result: $result,
  data: [
    {title: "Total",    type: "NUMBER", value: length},
    {title: "Critical", type: "NUMBER", value: [.[] | select(.sev == "CRITICAL")] | length},
    {title: "High",     type: "NUMBER", value: [.[] | select(.sev == "HIGH")] | length},
    {title: "Medium",   type: "NUMBER", value: [.[] | select(.sev == "MEDIUM")] | length},
    {title: "Low",      type: "NUMBER", value: [.[] | select(.sev == "LOW")] | length},
    {title: "Advisory database", type: "LINK", value: {text: "osv.dev", href: "https://osv.dev"}}
  ]
}' /tmp/osv-vulns.json > /tmp/osv-report.json

curl -sfS --proxy "$PROXY" -X PUT "$API/reports/osv-scan" \
  -H "Content-Type: application/json" -d @/tmp/osv-report.json > /dev/null

# One annotation per vulnerability+package, capped at Bitbucket's 100-per-request limit.
jq -c --arg clone "${BITBUCKET_CLONE_DIR}/" '
  [ .results[]? as $r
    | $r.packages[]? as $p
    | $p.vulnerabilities[]?
    | { external_id: (.id + ":" + $p.package.name),
        title: (.id + " - " + $p.package.name + "@" + $p.package.version),
        annotation_type: "VULNERABILITY",
        summary: ((.summary // .details // .id) | .[0:400]),
        details: ("Fixed in: " + ([.affected[]?.ranges[]?.events[]?.fixed // empty] | unique | join(", ") | if . == "" then "no fix listed" else . end)
                  + " | Advisory: https://osv.dev/" + .id),
        severity: (((.database_specific.severity // "MEDIUM") | ascii_upcase) | if . == "MODERATE" then "MEDIUM" else . end),
        path: ($r.source.path | ltrimstr($clone)),
        link: ("https://osv.dev/" + .id) }
  ] | unique_by(.external_id) | .[0:100]' "$RESULTS_JSON" > /tmp/osv-annotations.json

COUNT=$(jq length /tmp/osv-annotations.json)
if [ "$COUNT" -gt 0 ]; then
  curl -sfS --proxy "$PROXY" -X POST "$API/reports/osv-scan/annotations" \
    -H "Content-Type: application/json" -d @/tmp/osv-annotations.json > /dev/null
fi

echo "Published Code Insights report: $TOTAL vulnerabilities, $COUNT annotations"
