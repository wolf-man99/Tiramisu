import { ex } from './helpers';

/**
 * Module 10 — The GA4 export schema (day 12).
 *
 * 14 exercises. The GA4 BigQuery export is where most marketers meet real SQL, and
 * where most of them give up: one row per event, dates as strings, timestamps in
 * microseconds, and everything interesting buried in a repeated key/value array. This
 * module rebuilds the GA4 UI's own reports from raw events and then reconciles them.
 */
export const M10 = [
  ex('10.1', 12, 'easy',
    'One row per event',
    'Return `event_name` and `events` — the event volume by name. Order by events descending.',
    ['ga4_events'], ['ga4-schema'],
    `SELECT event_name, COUNT(*) AS events
FROM ga4_events
GROUP BY event_name
ORDER BY events DESC, event_name`,
    ['The export\'s grain is one row per event, so COUNT(*) is an event count.',
      'GROUP BY event_name and sort the counts descending.'],
    { orderMatters: true,
      explanation: 'page_view dominates every GA4 export. Any "events" number you quote is meaningless without saying which events — a fact that makes the GA4 UI\'s headline event count almost useless.' }),

  ex('10.2', 12, 'easy',
    'Users, three ways',
    'Return `total_events`, `devices` (distinct user_pseudo_id) and `logged_in_users` (distinct user_id).',
    ['ga4_events'], ['ga4-schema', 'null-handling', 'distinct'],
    `SELECT COUNT(*) AS total_events,
       COUNT(DISTINCT user_pseudo_id) AS devices,
       COUNT(DISTINCT user_id) AS logged_in_users
FROM ga4_events`,
    ['`user_pseudo_id` identifies a device/browser; `user_id` is your own account id.',
      'user_id is NULL until the user logs in, and COUNT DISTINCT skips NULLs.'],
    { explanation: '"Users" in GA4 means devices, not people. One person on a phone and a laptop is two users; two people sharing a laptop are one. Every cross-device number in the GA4 UI is an estimate built on top of that.' }),

  ex('10.3', 12, 'medium',
    'Sessions from raw events',
    'Return `session_date` and `sessions` for the first 10 days of January, counting distinct user_pseudo_id + ga_session_id pairs. Chronological.',
    ['ga4_events'], ['ga4-schema', 'distinct'],
    `SELECT event_date AS session_date,
       COUNT(DISTINCT CONCAT(user_pseudo_id, '-', CAST(ga_session_id AS STRING))) AS sessions
FROM ga4_events
WHERE event_date BETWEEN '20240101' AND '20240110'
GROUP BY session_date
ORDER BY session_date`,
    ['The session key is the pair, not ga_session_id alone.',
      'Filter on the raw string date so the partition prunes.'],
    { orderMatters: true }),

  ex('10.4', 12, 'medium',
    'Pull page_location out of event_params',
    'Return `page` and `views` for the 15 most-viewed pages.',
    ['ga4_events'], ['unnest', 'ga4-params'],
    `SELECT
  (SELECT ep.value.string_value FROM UNNEST(e.event_params) AS ep WHERE ep.key = 'page_location') AS page,
  COUNT(*) AS views
FROM ga4_events e
WHERE e.event_name = 'page_view'
GROUP BY page
ORDER BY views DESC, page
LIMIT 15`,
    ['The scalar-subquery-over-UNNEST idiom.',
      'page_location is a string parameter, so read `value.string_value`.'],
    { orderMatters: true }),

  ex('10.5', 12, 'medium',
    'Session-scoped source and medium',
    'Return `source`, `medium` and `events` from the event_params, for the top 10 combinations.',
    ['ga4_events'], ['unnest', 'ga4-params'],
    `SELECT
  (SELECT ep.value.string_value FROM UNNEST(e.event_params) AS ep WHERE ep.key = 'source') AS source,
  (SELECT ep.value.string_value FROM UNNEST(e.event_params) AS ep WHERE ep.key = 'medium') AS medium,
  COUNT(*) AS events
FROM ga4_events e
GROUP BY source, medium
ORDER BY events DESC, source, medium
LIMIT 10`,
    ['Two scalar subqueries, one per parameter.',
      'Both source and medium are string parameters, so read `value.string_value`.'],
    { orderMatters: true }),

  ex('10.6', 12, 'hard',
    'traffic_source is not session source',
    'Return `user_source` (from the traffic_source STRUCT) and `users` — distinct devices per first-touch source. Order by users descending.',
    ['ga4_events'], ['struct', 'ga4-schema', 'attribution'],
    `SELECT traffic_source.source AS user_source,
       COUNT(DISTINCT user_pseudo_id) AS users
FROM ga4_events
GROUP BY user_source
ORDER BY users DESC, user_source`,
    ['`traffic_source` is a STRUCT, so read it with a dot — no UNNEST.',
      'It is USER-scoped and never changes, unlike the session-scoped source in event_params.'],
    { orderMatters: true,
      explanation: 'This is the single most misunderstood thing in the GA4 export. `traffic_source` is the user\'s *first ever* source and is stamped on every event they will ever fire. The `source` parameter inside event_params is the session\'s source. They disagree constantly, and reports built on the wrong one attribute everything to whatever channel first found the user.',
      trap: 'Using traffic_source for channel reporting and wondering why paid campaigns get credit for direct visits months later.' }),

  ex('10.7', 12, 'medium',
    'Device and geo breakdown',
    'Return `device_category`, `operating_system`, `country` and `sessions` for the top 12 combinations.',
    ['ga4_events'], ['struct', 'ga4-schema'],
    `SELECT device.category AS device_category,
       device.operating_system AS operating_system,
       geo.country AS country,
       COUNT(DISTINCT CONCAT(user_pseudo_id, '-', CAST(ga_session_id AS STRING))) AS sessions
FROM ga4_events
GROUP BY device_category, operating_system, country
ORDER BY sessions DESC, device_category, operating_system, country
LIMIT 12`,
    ['Three STRUCT fields, all read with dots.',
      'Sessions still need the composite key.'],
    { orderMatters: true }),

  ex('10.8', 12, 'hard',
    'Ecommerce revenue from events',
    'Return `event_date` and `revenue` from the `ecommerce` STRUCT on purchase events, for December 2024. Chronological.',
    ['ga4_events'], ['struct', 'ga4-schema'],
    `SELECT event_date, SUM(ecommerce.purchase_revenue) AS revenue
FROM ga4_events
WHERE event_name = 'purchase'
  AND event_date BETWEEN '20241201' AND '20241231'
GROUP BY event_date
ORDER BY event_date`,
    ['`ecommerce` is a STRUCT populated only on purchase events.',
      'Filter to purchases or you sum a column that is null everywhere else.'],
    { orderMatters: true }),

  ex('10.9', 12, 'hard',
    'Rebuild the channel grouping',
    'GA4\'s default channel grouping is derived, not stored. Rebuild it: return `channel` and `sessions` using source and medium from event_params, applying the standard rules. Order by sessions descending.',
    ['ga4_events'], ['unnest', 'case-when', 'ga4-schema'],
    `WITH sessions AS (
  SELECT DISTINCT
    CONCAT(user_pseudo_id, '-', CAST(ga_session_id AS STRING)) AS session_key,
    (SELECT ep.value.string_value FROM UNNEST(e.event_params) AS ep WHERE ep.key = 'source') AS source,
    (SELECT ep.value.string_value FROM UNNEST(e.event_params) AS ep WHERE ep.key = 'medium') AS medium
  FROM ga4_events e
)
SELECT CASE
         WHEN medium = 'cpc' THEN 'Paid Search'
         WHEN medium = 'paid_social' THEN 'Paid Social'
         WHEN medium = 'organic' THEN 'Organic Search'
         WHEN medium = 'email' THEN 'Email'
         WHEN medium = 'referral' THEN 'Referral'
         WHEN medium = 'display' THEN 'Display'
         WHEN medium = 'affiliate' THEN 'Affiliate'
         WHEN medium = '(none)' THEN 'Direct'
         ELSE 'Other'
       END AS channel,
       COUNT(*) AS sessions
FROM sessions
GROUP BY channel
ORDER BY sessions DESC, channel`,
    ['Collapse to one row per session first, carrying its source and medium.',
      'Then a CASE ladder over medium reproduces the channel grouping.',
      'An ELSE branch catches anything the rules do not cover — never let traffic vanish.'],
    { orderMatters: true,
      explanation: 'Channel grouping is business logic, not data. GA4 ships a default set of rules; every company eventually overrides them. Owning the CASE ladder in SQL is what lets you match the definition your CMO actually uses.' }),

  ex('10.10', 12, 'hard',
    'Funnel by session',
    'Return `sessions`, `view_item`, `add_to_cart`, `begin_checkout` and `purchase` — distinct sessions reaching each step.',
    ['ga4_events'], ['funnel', 'ga4-schema', 'conditional-aggregation'],
    `WITH per_session AS (
  SELECT CONCAT(user_pseudo_id, '-', CAST(ga_session_id AS STRING)) AS session_key,
         MAX(CASE WHEN event_name = 'session_start'  THEN 1 ELSE 0 END) AS s_start,
         MAX(CASE WHEN event_name = 'view_item'      THEN 1 ELSE 0 END) AS s_view,
         MAX(CASE WHEN event_name = 'add_to_cart'    THEN 1 ELSE 0 END) AS s_cart,
         MAX(CASE WHEN event_name = 'begin_checkout' THEN 1 ELSE 0 END) AS s_checkout,
         MAX(CASE WHEN event_name = 'purchase'       THEN 1 ELSE 0 END) AS s_purchase
  FROM ga4_events
  GROUP BY session_key
)
SELECT SUM(s_start) AS sessions,
       SUM(s_view) AS view_item,
       SUM(s_cart) AS add_to_cart,
       SUM(s_checkout) AS begin_checkout,
       SUM(s_purchase) AS purchase
FROM per_session`,
    ['Flatten to one row per session with a flag per step.',
      'MAX over a 0/1 flag answers "did it ever happen in this session?".'],
    { explanation: 'This is an *any-order* funnel: it asks whether each step happened, not whether it happened in sequence. A strict-order funnel needs event timestamps and window functions, and always reports lower numbers.' }),

  ex('10.11', 12, 'hard',
    'Landing page from the first event',
    'Return `landing_page` and `sessions` — the page_location of each session\'s earliest event. Top 10.',
    ['ga4_events'], ['unnest', 'row-number', 'ga4-schema'],
    `WITH events AS (
  SELECT CONCAT(user_pseudo_id, '-', CAST(ga_session_id AS STRING)) AS session_key,
         event_timestamp,
         (SELECT ep.value.string_value FROM UNNEST(e.event_params) AS ep WHERE ep.key = 'page_location') AS page
  FROM ga4_events e
  WHERE e.event_name = 'page_view'
),
first_page AS (
  SELECT session_key, page
  FROM events
  QUALIFY ROW_NUMBER() OVER (PARTITION BY session_key ORDER BY event_timestamp) = 1
)
SELECT page AS landing_page, COUNT(*) AS sessions
FROM first_page
GROUP BY landing_page
ORDER BY sessions DESC, landing_page
LIMIT 10`,
    ['The landing page is the page_location of the earliest page_view in the session.',
      'ROW_NUMBER ordered by event_timestamp, then keep row 1.',
      'event_timestamp is in microseconds but still sorts correctly as a number.'],
    { orderMatters: true }),

  ex('10.12', 12, 'hard',
    'Time on site',
    'Return `event_date` and `avg_session_seconds` — the span between a session\'s first and last event — for the first 10 days of March. Chronological.',
    ['ga4_events'], ['ga4-schema', 'date-functions'],
    `WITH spans AS (
  SELECT event_date,
         CONCAT(user_pseudo_id, '-', CAST(ga_session_id AS STRING)) AS session_key,
         (MAX(event_timestamp) - MIN(event_timestamp)) / 1000000 AS session_seconds
  FROM ga4_events
  WHERE event_date BETWEEN '20240301' AND '20240310'
  GROUP BY event_date, session_key
)
SELECT event_date, AVG(session_seconds) AS avg_session_seconds
FROM spans
GROUP BY event_date
ORDER BY event_date`,
    ['MAX minus MIN of event_timestamp gives the span in microseconds.',
      'Divide by 1,000,000 for seconds.',
      'Aggregate per session first, then average the sessions.'],
    { orderMatters: true,
      explanation: 'This measures time between first and last event, which is not what GA4 calls engagement time — GA4 sums `engagement_time_msec` from the parameters instead. Two defensible definitions, two different numbers, and this is exactly why your SQL will never match the UI to the last decimal.' }),

  ex('10.13', 12, 'expert',
    'Traffic acquisition report',
    'Rebuild GA4\'s Traffic Acquisition report: `channel`, `sessions`, `engaged_sessions`, `conversions` and `revenue`, from raw events. Order by sessions descending.',
    ['ga4_events'], ['unnest', 'case-when', 'ga4-schema', 'funnel'],
    `WITH per_session AS (
  SELECT CONCAT(user_pseudo_id, '-', CAST(ga_session_id AS STRING)) AS session_key,
         MAX((SELECT ep.value.string_value FROM UNNEST(e.event_params) AS ep WHERE ep.key = 'medium')) AS medium,
         MAX(CASE WHEN e.event_name = 'purchase' THEN 1 ELSE 0 END) AS converted,
         SUM(CASE WHEN e.event_name = 'purchase' THEN e.ecommerce.purchase_revenue ELSE 0 END) AS revenue,
         COUNT(*) AS events
  FROM ga4_events e
  GROUP BY session_key
)
SELECT CASE
         WHEN medium = 'cpc' THEN 'Paid Search'
         WHEN medium = 'paid_social' THEN 'Paid Social'
         WHEN medium = 'organic' THEN 'Organic Search'
         WHEN medium = 'email' THEN 'Email'
         WHEN medium = 'referral' THEN 'Referral'
         WHEN medium = 'display' THEN 'Display'
         WHEN medium = 'affiliate' THEN 'Affiliate'
         WHEN medium = '(none)' THEN 'Direct'
         ELSE 'Other'
       END AS channel,
       COUNT(*) AS sessions,
       COUNTIF(events > 1) AS engaged_sessions,
       SUM(converted) AS conversions,
       SUM(revenue) AS revenue
FROM per_session
GROUP BY channel
ORDER BY sessions DESC, channel`,
    ['Collapse to one row per session carrying medium, conversion flag and revenue.',
      'Then group those sessions into channels.',
      'Engagement here is approximated by more than one event — GA4 uses its own rule.'],
    { orderMatters: true }),

  ex('10.14', 12, 'expert',
    'Reconcile raw events against the session table',
    'Compare your rebuild to the pre-flattened table. Return `events_sessions` (distinct session keys in ga4_events), `table_sessions` (rows in ga4_sessions), and `difference`.',
    ['ga4_events', 'ga4_sessions'], ['ga4-schema', 'grain'],
    `SELECT
  (SELECT COUNT(DISTINCT CONCAT(user_pseudo_id, '-', CAST(ga_session_id AS STRING))) FROM ga4_events) AS events_sessions,
  (SELECT COUNT(*) FROM ga4_sessions) AS table_sessions,
  (SELECT COUNT(DISTINCT CONCAT(user_pseudo_id, '-', CAST(ga_session_id AS STRING))) FROM ga4_events)
  - (SELECT COUNT(*) FROM ga4_sessions) AS difference`,
    ['Two scalar subqueries and their difference.',
      'Reconciling a rebuild against a trusted source is the last step of any migration.'],
    {
      explanation:
        'The two numbers agree here, which is the point: when your rebuild matches the source you can trust it, and when it does not you have found either a bug or a definition you did not know about. Reconciling *before* you publish is what separates an analyst people trust from one they check.',
    }),
];
