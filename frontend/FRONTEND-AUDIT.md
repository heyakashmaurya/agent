# Frontend v2 audit notes

## Major changes from the previous frontend

1. Preserved React + Vite to avoid introducing unnecessary framework churn.
2. Added a route map for every important backend-backed workflow.
3. Centralized HTTP behavior and authentication header handling.
4. Added role-aware copy matching Owner / Manager / Staff backend authorization.
5. Added real loading/error states and an explicit opt-in demo mode.
6. Added booking creation/cancellation UI around the documented booking contracts.
7. Added table status controls around the documented table contracts.
8. Added call-log filters and a detail modal around the documented call-log contracts.
9. Added analytics date-range support for `/api/analytics/overview`.
10. Added LiveKit token and outbound-call operator pages.
11. Added customer aggregation rather than inventing an unavailable `/api/customers` API.
12. Added responsive/mobile navigation and production deployment rewrite.

## Known backend limitations

The frontend cannot make a disabled or missing backend contract live by itself. The current repository exposes the route files used above, but some route/controller areas are still evolving. When an endpoint returns a 404/500, the UI surfaces the backend error instead of silently claiming success.
