# Release gates

Before any production release:

- Type checks, tests, and build pass
- Representative mobile/tablet/desktop QA passes
- Accessibility basics reviewed
- Forms, links, navigation, and active-workout state verified
- Offline/interruption behaviour tested where relevant
- Analytics and error reporting verified
- Sensitive-data logging reviewed
- Security/privacy impact reviewed for new health-data flows
- Database migration/backup plan documented
- Deployment steps documented
- Rollback procedure confirmed
- No production deployment is considered complete until post-deploy verification passes
