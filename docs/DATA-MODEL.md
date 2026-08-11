# Data model

Two independent databases. See `docs/ARCHITECTURE.md` §1 for why.

---

# Part A, The marketing warehouse (queried by learners)

Project/dataset naming mirrors BigQuery so learner SQL transfers directly:

```
growthsql-academy.marketing_analytics.<table>
```

All three-part and backtick-quoted forms resolve to the same local table, so
`` `growthsql-academy.marketing_analytics.orders` ``, `marketing_analytics.orders` and
`orders` are interchangeable.

**Company being modelled:** *Northbeam*, a hybrid B2C e-commerce + B2B SaaS company
(deliberately hybrid so one warehouse can teach ROAS *and* MRR/churn).
**Window:** 2024-01-01 → 2024-12-31 (366 days, leap year: intentional, it breaks naive
date maths and that is a lesson).
**Currency:** USD, stored in major units as `REAL`.

## A.1 Paid media

### `google_ads_campaigns`
| column | type | notes |
|---|---|---|
| campaign_id | INTEGER PK | |
| campaign_name | TEXT | real convention: `GB_Search_NonBrand_UK_Exact` |
| channel_type | TEXT | `SEARCH` \| `PMAX` \| `DISPLAY` \| `VIDEO` \| `SHOPPING` |
| status | TEXT | `ENABLED` \| `PAUSED` \| `REMOVED` |
| is_brand | INTEGER | 0/1: brand vs non-brand, the single most common segmentation |
| country | TEXT | ISO-2 |
| daily_budget | REAL | |
| start_date | TEXT | ISO date |

### `google_ads_ad_groups`
`ad_group_id` PK, `campaign_id` FK, `ad_group_name`, `status`, `default_cpc_bid`.

### `google_ads_daily`, grain: **date × ad_group**
`date`, `campaign_id`, `ad_group_id`, `impressions`, `clicks`, `cost`, `conversions`,
`conversion_value`, `view_through_conversions`.
*Note:* `conversions` is fractional (Google attributes fractionally). Learners who
`CAST(conversions AS INT)` lose 8% of conversions. This is exercise 4.17.

### `google_ads_keywords`
`keyword_id` PK, `ad_group_id` FK, `campaign_id` FK, `keyword_text`, `match_type`
(`EXACT`/`PHRASE`/`BROAD`), `quality_score` (1–10, **nullable**. New keywords have none).

### `google_ads_keyword_daily`, grain: **date × keyword**
`date`, `keyword_id`, `impressions`, `clicks`, `cost`, `conversions`,
`conversion_value`, `search_impression_share` (nullable, REAL 0–1).

### `meta_ads_campaigns`
`campaign_id` PK, `campaign_name`, `objective` (`CONVERSIONS`/`TRAFFIC`/`AWARENESS`/
`CATALOG_SALES`/`LEAD_GENERATION`), `buying_type`, `status`, `created_date`.

### `meta_ads_daily`, grain: **date × ad_set × creative**
`date`, `campaign_id`, `adset_id`, `adset_name`, `creative_id`, `creative_format`
(`IMAGE`/`VIDEO`/`CAROUSEL`/`REELS`), `impressions`, `reach`, `frequency`, `clicks`,
`spend`, `purchases`, `purchase_value`, `video_3s_views`, `thruplays`.
*Note:* Meta reports `purchases` on a 7-day-click/1-day-view window and Google reports
`conversions` on last-click. Summing both double-counts. That is module 12's whole point.

### `linkedin_ads_campaigns` / `linkedin_ads_daily`
B2B side: `objective` (`LEAD_GEN`/`WEBSITE_VISITS`/`BRAND_AWARENESS`), targeting
`job_function`/`seniority`/`company_size`; daily metrics plus `leads`, `lead_form_opens`.

### `ad_spend_daily` *(VIEW)*
`UNION ALL` of the three channels normalised to
`date, channel, campaign_id, campaign_name, spend, impressions, clicks, platform_conversions, platform_revenue`.
Teaching purpose: blended CAC/ROAS without repeating a three-way union by hand, and a
worked example of why a view is not a materialisation.

## A.2 Web & product analytics

### `ga4_events`, grain: **one row per event** (~62 k rows)
Mirrors the real GA4 BigQuery export shape.

| column | type | notes |
|---|---|---|
| event_date | TEXT | `YYYYMMDD`: **string, not date**, exactly like the real export |
| event_timestamp | INTEGER | **microseconds** since epoch, like the real export |
| event_name | TEXT | `session_start`, `page_view`, `view_item`, `add_to_cart`, `begin_checkout`, `add_payment_info`, `purchase`, `sign_up`, `login`, `view_promotion`, `scroll` |
| user_pseudo_id | TEXT | device-scoped id |
| user_id | TEXT | nullable, only set after login. The null-rate is the lesson. |
| ga_session_id | INTEGER | |
| ga_session_number | INTEGER | |
| event_params | JSON | repeated `{key, value:{string_value,int_value,double_value}}` |
| items | JSON | repeated struct: `item_id, item_name, item_category, price, quantity` |
| traffic_source | JSON | struct: `source, medium, name` |
| device | JSON | struct: `category, operating_system, browser, mobile_brand_name` |
| geo | JSON | struct: `continent, country, region, city` |
| ecommerce | JSON | struct: `transaction_id, purchase_revenue, tax_value, shipping_value` |

`event_params`, `items` are **ARRAY** columns; `traffic_source`, `device`, `geo`,
`ecommerce` are **STRUCT** columns. Both are JSON-backed locally; the transpiler makes
`UNNEST(event_params)` and `device.category` work verbatim (ARCHITECTURE §5).

### `ga4_sessions`
Pre-flattened session table so modules 1–8 can teach without `UNNEST`:
`session_key` PK, `user_pseudo_id`, `session_start_ts`, `session_date`, `channel_group`,
`source`, `medium`, `campaign`, `device_category`, `country`, `city`, `landing_page`,
`page_views`, `engaged`, `engagement_time_sec`, `converted`, `revenue`.

### `product_events` (Mixpanel / Amplitude shape)
`event_id` PK, `user_id`, `event_name` (`activated`, `invited_teammate`,
`created_report`, `connected_datasource`, `exported_csv`, `hit_paywall`), `event_time`,
`properties` JSON, `platform`, `app_version`.

### `landing_pages`
`page_path` PK, `page_title`, `template`, `ab_variant`, `is_paid_lp`, `published_date`.

## A.3 CRM

### `hubspot_contacts`
`contact_id` PK, `created_date`, `lifecycle_stage` (`subscriber`→`lead`→`mql`→`sql`→
`opportunity`→`customer`), `original_source`, `original_medium`, `original_campaign`,
`country`, `job_title`, `company_id` (nullable), `mql_date` (nullable),
`sql_date` (nullable), `became_customer_date` (nullable).

### `hubspot_deals`
`deal_id` PK, `contact_id` FK, `deal_name`, `pipeline`, `stage`, `amount`,
`created_date`, `close_date` (nullable), `is_won` (nullable. Open deals are neither).

### `salesforce_accounts`
`account_id` PK, `account_name`, `industry`, `employee_count`, `country`,
`tier` (`SMB`/`MidMarket`/`Enterprise`), `created_date`.

### `salesforce_opportunities`
`opportunity_id` PK, `account_id` FK, `owner_name`, `stage`, `amount`, `arr`,
`created_date`, `close_date`, `is_won`, `lead_source`, `campaign_id` (nullable, and the
nulls are the attribution lesson).

## A.4 Revenue

### `customers`
`customer_id` PK, `signup_date`, `first_touch_channel`, `last_touch_channel`,
`first_campaign_id` (nullable), `country`, `city`, `segment` (`B2C`/`B2B`),
`is_b2b`, `email_domain`.

### `orders`, e-commerce
`order_id` PK, `customer_id` FK, `order_ts`, `order_date`, `status`
(`completed`/`refunded`/`cancelled`/`pending`), `gross_revenue`, `discount_amount`,
`shipping_amount`, `tax_amount`, `cogs`, `channel`, `campaign_id` (nullable), `device`,
`country`, `city`, `coupon_code` (nullable), `is_first_order`.

### `order_items`
`order_id` FK, `product_id` FK, `quantity`, `unit_price`, `line_discount`.

### `products`
`product_id` PK, `product_name`, `category`, `brand`, `unit_cost`, `list_price`,
`launch_date`, `is_active`.

### `plans`
`plan_id` PK, `plan_name`, `tier` (`Starter`/`Growth`/`Scale`/`Enterprise`),
`list_mrr`, `seats_included`, `billing_interval`.

### `subscriptions`
`subscription_id` PK, `customer_id` FK, `plan_id` FK, `mrr`, `status`
(`trialing`/`active`/`past_due`/`canceled`), `started_at`, `trial_end_at` (nullable),
`canceled_at` (nullable), `cancel_reason` (nullable), `seats`.

### `stripe_charges`
`charge_id` PK, `customer_id` FK, `subscription_id` (nullable), `amount`, `currency`,
`created_at`, `status` (`succeeded`/`failed`/`refunded`), `refunded_amount`,
`failure_code` (nullable), `card_brand`, `card_country`.

## A.5 Lifecycle & support

### `email_campaigns`
`email_id` PK, `campaign_name`, `sent_date`, `segment`, `subject_line`, `sent`,
`delivered`, `unique_opens`, `unique_clicks`, `unsubscribes`, `bounces`,
`attributed_revenue`.

### `support_tickets`
`ticket_id` PK, `customer_id` FK, `created_at`, `first_response_at` (nullable),
`resolved_at` (nullable), `channel`, `priority`, `category`, `csat` (nullable 1–5).

### `attribution_touchpoints`, grain: **one row per marketing touch**
`touch_id` PK, `customer_id` (nullable: anonymous touches exist), `user_pseudo_id`,
`touch_ts`, `channel`, `source`, `medium`, `campaign_id` (nullable),
`touch_position` (1-indexed within the journey), `journey_length`, `converted`,
`conversion_value`. This is the table module 12 uses to build first-touch, last-touch,
linear, time-decay and position-based attribution side by side.

### `date_dim`
`date` PK, `day_of_week`, `day_name`, `week_start`, `month_start`, `month_name`,
`quarter`, `year`, `is_weekend`, `is_holiday`, `holiday_name` (nullable). Exists so
learners learn **date spines**, the fix for "days with zero orders vanish from my
report", which is the single most common junior reporting bug.

## A.6 Deliberate data quality defects

Realistic data is dirty. These are seeded on purpose and each one anchors a lesson:

| Defect | Where | Lesson |
|---|---|---|
| `NULL` `quality_score` on new keywords | `google_ads_keywords` | `IS NULL`, and why `AVG` silently ignores nulls |
| `NULL` `user_id` before login | `ga4_events` | `COUNT(col)` ≠ `COUNT(*)` |
| Duplicate order rows (0.4%) | `orders` | `COUNT(DISTINCT)`, dedup with `ROW_NUMBER` |
| Negative `gross_revenue` on refunds | `orders` | filtering vs netting; signed metrics |
| Zero-impression campaign-days | `google_ads_daily` | division by zero → `SAFE_DIVIDE` |
| Campaigns with spend but no conversions | all ads tables | `LEFT JOIN` vs `INNER JOIN` |
| Orders with `campaign_id` not in any campaign table | `orders` | orphan FKs, `LEFT JOIN … IS NULL` |
| Test/internal traffic (`source='internal-qa'`) | `ga4_sessions` | filter hygiene before every analysis |
| Trailing-whitespace + case-variant city names | `orders` | `TRIM`, `LOWER`, why `GROUP BY city` over-counts |

## A.7 Approximate volumes

Exact, because the generator is deterministic:

| Table | Rows |
|---|---|
| `ga4_events` | 56 034 |
| `google_ads_keyword_daily` | 53 707 |
| `attribution_touchpoints` | 22 831 |
| `google_ads_daily` | 19 341 |
| `product_events` | 14 781 |
| `ad_spend_daily` *(view)* | 12 523 |
| `order_items` | 10 834 |
| `ga4_sessions` | 10 832 |
| `meta_ads_daily` | 7 634 |
| `orders` | 6 610 |
| `customers` / `customer_ltv` *(view)* | 5 200 each |
| `stripe_charges` | 5 174 |
| `hubspot_contacts` | 4 200 |
| `linkedin_ads_daily` | 1 652 |
| `support_tickets` | 1 586 |
| `subscriptions` | 999 |
| `hubspot_deals` | 792 |
| `date_dim` | 366 |
| `salesforce_accounts` / `salesforce_opportunities` | 320 / 316 |
| `google_ads_keywords` | 234 |
| `email_campaigns` | 132 |
| `google_ads_ad_groups` | 61 |
| `products` / `google_ads_campaigns` | 24 each |
| `landing_pages` / `meta_ads_campaigns` / `linkedin_ads_campaigns` / `plans` | 16 / 14 / 8 / 7 |
| **total** | **241 452** |

---

# Part B, Learner state (Prisma → `prisma/dev.db`)

```
Profile        1: id, displayName, avatarSeed, xp, coins, level, title,
                    currentStreak, longestStreak, lastActiveDate, streakFreezes,
                    createdAt, timezone, dailyGoalXp

LessonProgress n: profileId, dayNumber, section, status(locked|in_progress|complete),
                    score, completedAt        [unique: profileId+dayNumber+section]

Attempt        n: profileId, itemType(exercise|quiz|assessment|project|interview|
                    capstone|lab), itemId, sql, passed, ms, rowsReturned,
                    hintsUsed, revealed, diagnosis, createdAt

ConceptStat    n: profileId, concept, attempts, passes, avgMs, lastSeenAt,
                    mastery(0..1)            [unique: profileId+concept]

BadgeAward     n: profileId, badgeId, awardedAt        [unique: profileId+badgeId]

Bookmark       n: profileId, itemType, itemId, createdAt
Note           n: profileId, itemType, itemId, body, updatedAt
Flashcard      n: id, deck, front, back, concept        (content, seeded)
CardReview     n: profileId, cardId, ease, intervalDays, dueDate, reps, lapses  [SM-2]
Rival          n: displayName, avatarSeed, xp, level, country, streak  (leaderboard)
DailyActivity  n: profileId, date, xpEarned, exercisesSolved, minutesActive
                                                          [unique: profileId+date]
```

Only `Profile` is singleton-ish (`id = "local"`), because v1 is single-learner. Every
other table is keyed by `profileId` so multi-user is a drop-in later.
