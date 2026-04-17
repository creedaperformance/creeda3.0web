# CREEDA Incident Response Plan

## Purpose

This plan defines the minimum response workflow for security incidents affecting the CREEDA web and mobile platform, including unauthorized access, credential exposure, data leakage, malware, abuse of AI-assisted features, and service outages with security impact.

## Severity Levels

- `P1`: Active breach, confirmed credential compromise, sensitive data exposure, payment or account-takeover event, or a high-impact production outage with security implications.
- `P2`: Attempted intrusion, suspicious access pattern, repeated auth abuse, failed backup or recovery control, or a serious vulnerability with a known exploit path.
- `P3`: Security misconfiguration, isolated control failure, or non-exploited weakness requiring scheduled remediation.
- `P4`: Informational event, policy gap, or low-risk issue that still needs tracking.

## Response Targets

- `P1`: acknowledge within 15 minutes, containment started within 60 minutes.
- `P2`: acknowledge within 60 minutes, containment plan within 4 hours.
- `P3`: acknowledge within 1 business day, remediation plan within 5 business days.
- `P4`: acknowledge within 3 business days, backlog and track.

## Core Team

- Incident commander: Product owner or delegated engineering lead.
- Security lead: Security reviewer responsible for containment decisions.
- Communications owner: Business or support lead handling internal and customer messaging.
- Legal/privacy owner: External counsel or privacy advisor when personal data may be affected.
- Infrastructure owner: Hosting or platform operator with deploy and secret-rotation access.

## Detection Sources

- Application logs and request correlation IDs.
- Supabase auth events, database audit trails, and failed login spikes.
- CI security-build workflow failures.
- Vulnerability alerts from dependency scanning, hosting, WAF, or CDN providers.
- User reports, customer support issues, or abnormal behavior from monitoring.

## Immediate Actions

1. Create an incident record with timestamp, reporter, severity, and affected systems.
2. Preserve evidence before modifying impacted systems when possible.
3. Confirm scope: identities, routes, data stores, environments, and time window.
4. Contain the issue by revoking tokens, rotating secrets, blocking abusive traffic, disabling affected routes, or rolling back the last deploy.
5. Escalate to legal/privacy counsel if personal data, health-related data, or regulated workflows may be impacted.

## Containment Playbook

- Rotate `SUPABASE_SERVICE_ROLE_KEY`, database credentials, and any third-party API keys suspected to be exposed.
- Invalidate active user sessions if auth compromise is suspected.
- Disable or restrict the affected route behind feature gating or platform-level firewall controls.
- Apply temporary WAF or CDN rules to slow abusive traffic while the permanent fix is prepared.
- Capture deployment identifiers, request IDs, and representative logs for evidence.

## Communication

- Maintain one internal incident timeline with UTC timestamps.
- Prepare customer-facing language before external messaging.
- If personal data may be breached, evaluate notification duties under applicable law before sending.
- For GDPR-related incidents, prepare to assess the 72-hour supervisory authority timeline.
- For health or payment-related incidents, consult applicable contractual and regulatory notification rules immediately.

## Recovery

1. Deploy the verified fix.
2. Re-run health, readiness, and build security checks.
3. Validate database integrity and recent backups.
4. Monitor for recurrence during an elevated watch window.
5. Record final impact, root cause, and evidence location.

## Post-Incident Review

- Complete a root-cause analysis within 7 calendar days for `P1` and `P2`.
- Document what failed, why it failed, and which control should prevent recurrence.
- Add follow-up actions with owners and due dates.
- Update this plan, the security checklist mapping, and operational runbooks if gaps were found.

## Evidence To Preserve

- Request IDs, timestamps, and affected route names.
- Relevant application and platform logs.
- Authentication and database audit events.
- Deployment identifiers, commit hashes, and rollback details.
- Screenshots or exports of WAF, CDN, SIEM, or monitoring alerts.

## External Dependencies

This repository can support detection and safer failure handling, but response effectiveness still depends on external controls being maintained:

- WAF/CDN access and alerting.
- Secret manager with emergency rotation capability.
- Backup and restore process with tested recovery points.
- Legal/privacy contact and breach-notification decision path.
- Hosting and database provider escalation paths.
