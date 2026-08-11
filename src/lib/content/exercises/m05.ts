import { ex } from './helpers';

/**
 * Module 5, JOINs (days 6 and 7).
 *
 * 50 exercises. Two ideas carry the whole module: a filter on the right-hand table of
 * a LEFT JOIN silently converts it to an INNER JOIN, and joining across a grain change
 * fans rows out and inflates every SUM downstream. Both are taught by making them
 * happen and then measuring the damage.
 */
export const M05 = [
  // ── day 6: INNER and LEFT ──
  ex('5.1', 6, 'easy',
    'Your first join',
    'Return `campaign_name` and `ad_group_name` for every ad group, by joining ad groups to their campaign.',
    ['google_ads_ad_groups', 'google_ads_campaigns'], ['inner-join'],
    `SELECT c.campaign_name, g.ad_group_name
FROM google_ads_ad_groups g
JOIN google_ads_campaigns c ON c.campaign_id = g.campaign_id`,
    ['A join needs two things: the other table, and the condition that links them.',
      'The link is `campaign_id`, which exists in both tables.',
      'Give each table a short alias so you can say which column you mean.']),

  ex('5.2', 6, 'easy',
    'Join with USING',
    'Same result, shorter syntax: return `campaign_name` and `ad_group_name` using `USING (campaign_id)`.',
    ['google_ads_ad_groups', 'google_ads_campaigns'], ['inner-join'],
    `SELECT campaign_name, ad_group_name
FROM google_ads_ad_groups
JOIN google_ads_campaigns USING (campaign_id)`,
    ['`USING (col)` works when the join column has the same name in both tables.',
      'It also merges the two columns into one in the output.']),

  ex('5.3', 6, 'easy',
    'Order lines with product names',
    'Return `order_id`, `product_name`, `quantity` and `unit_price` for the first 25 order lines, ordered by order_id then product_id.',
    ['order_items', 'products'], ['inner-join'],
    `SELECT i.order_id, p.product_name, i.quantity, i.unit_price
FROM order_items i
JOIN products p ON p.product_id = i.product_id
ORDER BY i.order_id, i.product_id
LIMIT 25`,
    ['The line item has a product_id; the name lives on products.',
      'This is the classic fact-to-dimension join.'],
    { orderMatters: true }),

  ex('5.4', 6, 'easy',
    'Keywords with their campaign',
    'Return `keyword_text`, `match_type` and `campaign_name` for the first 20 keywords by keyword_id.',
    ['google_ads_keywords', 'google_ads_campaigns'], ['inner-join'],
    `SELECT k.keyword_text, k.match_type, c.campaign_name
FROM google_ads_keywords k
JOIN google_ads_campaigns c ON c.campaign_id = k.campaign_id
ORDER BY k.keyword_id
LIMIT 20`,
    ['Keywords carry campaign_id directly, so this is a single join.',
      'Order by keyword_id and take the first 20.'],
    { orderMatters: true }),

  ex('5.5', 6, 'easy',
    'Orders with customer country',
    'Return `order_id`, `gross_revenue` and the customer\'s `segment` for the first 20 completed orders by order_id.',
    ['orders', 'customers'], ['inner-join', 'where'],
    `SELECT o.order_id, o.gross_revenue, c.segment
FROM orders o
JOIN customers c ON c.customer_id = o.customer_id
WHERE o.status = 'completed'
ORDER BY o.order_id
LIMIT 20`,
    ['Join on customer_id, then filter on the order status.',
      'The WHERE can reference either table.'],
    { orderMatters: true }),

  ex('5.6', 6, 'medium',
    'Three tables',
    'Return `campaign_name`, `ad_group_name` and `keyword_text` for the first 20 keywords by keyword_id.',
    ['google_ads_keywords', 'google_ads_ad_groups', 'google_ads_campaigns'], ['inner-join'],
    `SELECT c.campaign_name, g.ad_group_name, k.keyword_text
FROM google_ads_keywords k
JOIN google_ads_ad_groups g ON g.ad_group_id = k.ad_group_id
JOIN google_ads_campaigns c ON c.campaign_id = g.campaign_id
ORDER BY k.keyword_id
LIMIT 20`,
    ['Chain joins one at a time: keyword → ad group → campaign.',
      'Each JOIN gets its own ON clause.'],
    { orderMatters: true }),

  ex('5.7', 6, 'medium',
    'Aggregate after joining',
    'Return `campaign_name` and `spend` per campaign for the top 10 by spend.',
    ['google_ads_daily', 'google_ads_campaigns'], ['inner-join', 'group-by', 'sum'],
    `SELECT c.campaign_name, SUM(d.cost) AS spend
FROM google_ads_daily d
JOIN google_ads_campaigns c ON c.campaign_id = d.campaign_id
GROUP BY c.campaign_name
ORDER BY spend DESC, c.campaign_name
LIMIT 10`,
    ['Join first, then group.',
      'Group by the label you want to see, aggregate the measure.'],
    { orderMatters: true }),

  ex('5.8', 6, 'medium',
    'LEFT JOIN keeps everything on the left',
    'Return `product_id`, `product_name` and `units`, total quantity sold, for every product, including products that never sold. Order by units ascending then product_id.',
    ['products', 'order_items'], ['left-join', 'group-by', 'null-handling'],
    `SELECT p.product_id, p.product_name, COALESCE(SUM(i.quantity), 0) AS units
FROM products p
LEFT JOIN order_items i ON i.product_id = p.product_id
GROUP BY p.product_id, p.product_name
ORDER BY units, p.product_id`,
    ['Start FROM the table you want to keep all of.',
      'A product with no matching line items gets NULLs from the right-hand table.',
      'COALESCE turns the NULL sum into a 0, which is what a stakeholder expects.'],
    { orderMatters: true,
      explanation: 'The difference between INNER and LEFT here is the difference between "products that sold" and "all products, with their sales". The second answers "what is not selling?", a question the first cannot even represent.' }),

  ex('5.9', 6, 'medium',
    'Campaigns with no orders attributed',
    'Return `campaign_id` and `campaign_name` for Google campaigns that have no attributed orders at all. Order by campaign_id.',
    ['google_ads_campaigns', 'orders'], ['left-join', 'anti-join', 'null-handling'],
    `SELECT c.campaign_id, c.campaign_name
FROM google_ads_campaigns c
LEFT JOIN orders o ON o.campaign_id = c.campaign_id
WHERE o.campaign_id IS NULL
ORDER BY c.campaign_id`,
    ['LEFT JOIN keeps unmatched campaigns, filling the order columns with NULL.',
      'Filtering `WHERE o.campaign_id IS NULL` keeps exactly the unmatched ones.',
      'This pattern is called an anti-join.'],
    { orderMatters: true,
      explanation: 'Two campaigns come back: the video and display *prospecting* campaigns. They have real spend and zero last-click orders, because upper-funnel prospecting is bought on view-through: their credit lives in `view_through_conversions`, not in `orders`. An INNER JOIN would have hidden them, and with them the argument for why they exist at all.' }),

  ex('5.10', 6, 'hard',
    'The filter that breaks your LEFT JOIN',
    'Count campaigns two ways in one row: `with_where` puts `o.status = \'completed\'` in the WHERE clause of a LEFT JOIN; `with_on` puts the same condition in the ON clause. Both should count distinct campaigns returned.',
    ['google_ads_campaigns', 'orders'], ['left-join', 'inner-join', 'boolean-logic'],
    `SELECT
  (SELECT COUNT(DISTINCT c.campaign_id)
   FROM google_ads_campaigns c
   LEFT JOIN orders o ON o.campaign_id = c.campaign_id
   WHERE o.status = 'completed') AS with_where,
  (SELECT COUNT(DISTINCT c.campaign_id)
   FROM google_ads_campaigns c
   LEFT JOIN orders o ON o.campaign_id = c.campaign_id AND o.status = 'completed') AS with_on`,
    ['Both queries have the same LEFT JOIN. Only the placement of the status filter differs.',
      'Think about what the unmatched rows look like after the join: every order column is NULL.',
      'A NULL status can never equal \'completed\'.'],
    {
      explanation:
        'Putting the condition in WHERE destroys the LEFT JOIN. Unmatched campaigns come through with `o.status = NULL`, the WHERE test on them is UNKNOWN, and they are dropped, turning your LEFT JOIN into an INNER JOIN without a word of warning. Conditions on the right-hand table of an outer join belong in ON. Conditions on the left-hand table belong in WHERE.',
      trap: 'The single most common JOIN bug in existence, and it fails silently. The query runs, the number is just wrong.',
    }),

  ex('5.11', 6, 'medium',
    'Filter in ON, correctly',
    'Return `campaign_name` and `completed_orders` for every Google campaign, including those with zero. Order by completed_orders descending then campaign_name.',
    ['google_ads_campaigns', 'orders'], ['left-join', 'group-by', 'count'],
    `SELECT c.campaign_name, COUNT(o.order_id) AS completed_orders
FROM google_ads_campaigns c
LEFT JOIN orders o ON o.campaign_id = c.campaign_id AND o.status = 'completed'
GROUP BY c.campaign_name
ORDER BY completed_orders DESC, c.campaign_name`,
    ['Put the status condition in the ON clause so unmatched campaigns survive.',
      'Use COUNT(o.order_id), not COUNT(*). COUNT(*) would count the NULL row as 1.'],
    { orderMatters: true,
      trap: 'COUNT(*) on the outer side of a LEFT JOIN reports 1 for groups that have nothing.' }),

  ex('5.12', 6, 'medium',
    'Customers who never ordered',
    'Return `customer_id`, `signup_date` and `first_touch_channel` for customers with no completed orders. Order by customer_id, limit 25.',
    ['customers', 'orders'], ['left-join', 'anti-join'],
    `SELECT c.customer_id, c.signup_date, c.first_touch_channel
FROM customers c
LEFT JOIN orders o ON o.customer_id = c.customer_id AND o.status = 'completed'
WHERE o.order_id IS NULL
ORDER BY c.customer_id
LIMIT 25`,
    ['Anti-join: LEFT JOIN, then keep rows where the right side is NULL.',
      'The status condition goes in ON so it does not defeat the LEFT JOIN.'],
    { orderMatters: true }),

  ex('5.13', 6, 'medium',
    'Spend and revenue side by side',
    'For each Google campaign return `campaign_name`, `spend` and `revenue` from attributed completed orders. Include campaigns with no revenue. Top 15 by spend.',
    ['google_ads_campaigns', 'google_ads_daily', 'orders'], ['left-join', 'group-by', 'roas'],
    `SELECT c.campaign_name,
       COALESCE(s.spend, 0) AS spend,
       COALESCE(r.revenue, 0) AS revenue
FROM google_ads_campaigns c
LEFT JOIN (SELECT campaign_id, SUM(cost) AS spend FROM google_ads_daily GROUP BY campaign_id) s
       ON s.campaign_id = c.campaign_id
LEFT JOIN (SELECT campaign_id, SUM(gross_revenue) AS revenue FROM orders
           WHERE status = 'completed' GROUP BY campaign_id) r
       ON r.campaign_id = c.campaign_id
ORDER BY spend DESC, c.campaign_name
LIMIT 15`,
    ['Do not join the two fact tables directly to each other. You would fan out.',
      'Aggregate each side to campaign grain *first*, then join the two summaries.',
      'This "aggregate then join" shape is the fix for almost every fan-out problem.'],
    { orderMatters: true,
      explanation: 'Joining google_ads_daily to orders directly would multiply every campaign-day by every order of that campaign. Collapsing each side to one row per campaign before joining keeps the grain honest.' }),

  ex('5.14', 6, 'medium',
    'Deals with their contact',
    'Return `deal_id`, `amount`, `stage` and the contact\'s `original_source` for the 20 largest deals.',
    ['hubspot_deals', 'hubspot_contacts'], ['inner-join', 'order-by'],
    `SELECT d.deal_id, d.amount, d.stage, c.original_source
FROM hubspot_deals d
JOIN hubspot_contacts c ON c.contact_id = d.contact_id
ORDER BY d.amount DESC, d.deal_id
LIMIT 20`,
    ['Join deals to contacts on contact_id.',
      'Sort by amount descending, tie-break on deal_id, then LIMIT 20.'],
    { orderMatters: true }),

  ex('5.15', 6, 'medium',
    'Opportunities by account tier',
    'Return `tier`, `opportunities` and `total_arr` for won opportunities, ordered by total_arr descending.',
    ['salesforce_opportunities', 'salesforce_accounts'], ['inner-join', 'group-by', 'where'],
    `SELECT a.tier, COUNT(*) AS opportunities, SUM(o.arr) AS total_arr
FROM salesforce_opportunities o
JOIN salesforce_accounts a ON a.account_id = o.account_id
WHERE o.is_won = 1
GROUP BY a.tier
ORDER BY total_arr DESC`,
    ['`is_won = 1` keeps only won deals. Note it excludes the open ones, whose is_won is NULL.',
      'Group by the account tier.'],
    { orderMatters: true }),

  ex('5.16', 6, 'medium',
    'Subscriptions with plan and customer',
    'Return `subscription_id`, `plan_name`, `mrr`, `segment` and `country` for the 20 highest-MRR active subscriptions.',
    ['subscriptions', 'plans', 'customers'], ['inner-join'],
    `SELECT s.subscription_id, p.plan_name, s.mrr, c.segment, c.country
FROM subscriptions s
JOIN plans p ON p.plan_id = s.plan_id
JOIN customers c ON c.customer_id = s.customer_id
WHERE s.status = 'active'
ORDER BY s.mrr DESC, s.subscription_id
LIMIT 20`,
    ['Two joins from the subscription: one to plans, one to customers.',
      'Filter to active subscriptions, then sort by mrr descending.'],
    { orderMatters: true }),

  ex('5.17', 6, 'medium',
    'Sessions joined to landing page metadata',
    'Return `template`, `sessions`, `conversions` and `cvr`, excluding internal QA traffic. Order by sessions descending.',
    ['ga4_sessions', 'landing_pages'], ['inner-join', 'group-by', 'rate-metrics'],
    `SELECT lp.template,
       COUNT(*) AS sessions,
       SUM(s.converted) AS conversions,
       SAFE_DIVIDE(SUM(s.converted), COUNT(*)) AS cvr
FROM ga4_sessions s
JOIN landing_pages lp ON lp.page_path = s.landing_page
WHERE s.source != 'internal-qa'
GROUP BY lp.template
ORDER BY sessions DESC, lp.template`,
    ['The join key is the page path: a text column, not an id.',
      'Any column can be a join key as long as the values match.'],
    { orderMatters: true }),

  ex('5.18', 6, 'medium',
    'Orders with no matching campaign',
    'Return `order_id`, `campaign_id` and `gross_revenue` for orders whose campaign_id exists but matches no Google, Meta or LinkedIn campaign. Order by order_id, limit 20.',
    ['orders', 'google_ads_campaigns', 'meta_ads_campaigns', 'linkedin_ads_campaigns'],
    ['left-join', 'anti-join', 'null-handling'],
    `SELECT o.order_id, o.campaign_id, o.gross_revenue
FROM orders o
LEFT JOIN google_ads_campaigns g   ON g.campaign_id = o.campaign_id
LEFT JOIN meta_ads_campaigns m     ON m.campaign_id = o.campaign_id
LEFT JOIN linkedin_ads_campaigns l ON l.campaign_id = o.campaign_id
WHERE o.campaign_id IS NOT NULL
  AND g.campaign_id IS NULL
  AND m.campaign_id IS NULL
  AND l.campaign_id IS NULL
ORDER BY o.order_id
LIMIT 20`,
    ['Three LEFT JOINs, one per platform.',
      'An orphan is a row that matched none of them. All three right-hand keys are NULL.',
      'Do not forget to exclude orders that simply have no campaign at all.'],
    { orderMatters: true,
      explanation: 'These are orders attributed to campaigns that no longer exist, deleted in the ad platform but still referenced in your warehouse. Every real warehouse has them, and every naive INNER JOIN silently deletes their revenue from your reporting.' }),

  ex('5.19', 6, 'medium',
    'Support tickets by customer segment',
    'Return `segment`, `tickets` and `avg_csat`, ordered by tickets descending.',
    ['support_tickets', 'customers'], ['inner-join', 'group-by', 'avg'],
    `SELECT c.segment, COUNT(*) AS tickets, AVG(t.csat) AS avg_csat
FROM support_tickets t
JOIN customers c ON c.customer_id = t.customer_id
GROUP BY c.segment
ORDER BY tickets DESC`,
    ['Join tickets to customers, group by segment.',
      'COUNT(*) for tickets and AVG(csat) for the score, AVG skips the unsurveyed ones.'],
    { orderMatters: true }),

  ex('5.20', 6, 'hard',
    'Charges without a subscription',
    'Return `charge_id`, `customer_id` and `amount` for succeeded charges that are one-off (no subscription). Order by amount descending, top 20.',
    ['stripe_charges'], ['null-handling', 'where'],
    `SELECT charge_id, customer_id, amount
FROM stripe_charges
WHERE status = 'succeeded'
  AND subscription_id IS NULL
ORDER BY amount DESC, charge_id
LIMIT 20`,
    ['No join needed. The absence is expressed by a NULL foreign key.',
      'Recognising when you do *not* need a join is part of the skill.'],
    { orderMatters: true }),

  ex('5.21', 6, 'hard',
    'Two joins, two grains, one report',
    'Per `first_touch_channel`, return `customers`, `orders` and `revenue`, including channels whose customers never ordered. Order by revenue descending.',
    ['customers', 'orders'], ['left-join', 'group-by', 'count', 'distinct'],
    `SELECT c.first_touch_channel,
       COUNT(DISTINCT c.customer_id) AS customers,
       COUNT(o.order_id) AS orders,
       COALESCE(SUM(o.gross_revenue), 0) AS revenue
FROM customers c
LEFT JOIN orders o ON o.customer_id = c.customer_id AND o.status = 'completed'
GROUP BY c.first_touch_channel
ORDER BY revenue DESC`,
    ['After the join, one customer appears once per order. So a plain COUNT would overcount customers.',
      'COUNT(DISTINCT c.customer_id) fixes the customer count.',
      'COUNT(o.order_id) skips the NULL rows from unmatched customers.'],
    { orderMatters: true,
      explanation: 'This is fan-out in miniature: joining a 1:N relationship duplicates the "1" side. Counting the duplicated side needs DISTINCT; summing a column from the duplicated side would be simply wrong.' }),

  ex('5.22', 6, 'hard',
    'Attach spend to the right grain',
    'Return `date` and `total_spend` across all three platforms for October 2024, using `ad_spend_daily`. Every day in October must appear, even with zero spend. Chronological order.',
    ['date_dim', 'ad_spend_daily'], ['left-join', 'date-spine', 'group-by'],
    `SELECT d.date, COALESCE(SUM(a.spend), 0) AS total_spend
FROM date_dim d
LEFT JOIN ad_spend_daily a ON a.date = d.date
WHERE d.date BETWEEN '2024-10-01' AND '2024-10-31'
GROUP BY d.date
ORDER BY d.date`,
    ['Start from date_dim so every calendar day is guaranteed a row.',
      'LEFT JOIN the spend onto it.',
      'The date filter goes on the date dimension, not the spend table.'],
    { orderMatters: true,
      explanation: 'The date spine. Without it, a day with no spend simply has no row, your chart draws a straight line across the gap, and nobody notices the campaign was off.' }),

  ex('5.23', 6, 'hard',
    'Contacts with and without accounts',
    'Return `has_account` (the text `matched` or `unmatched`) and `contacts`, splitting HubSpot contacts by whether their `company_id` resolves to a Salesforce account.',
    ['hubspot_contacts', 'salesforce_accounts'], ['left-join', 'case-when', 'group-by'],
    `SELECT CASE WHEN a.account_id IS NULL THEN 'unmatched' ELSE 'matched' END AS has_account,
       COUNT(*) AS contacts
FROM hubspot_contacts c
LEFT JOIN salesforce_accounts a ON a.account_id = c.company_id
GROUP BY has_account
ORDER BY has_account`,
    ['LEFT JOIN, then use CASE on whether the right side came back NULL.',
      'Group by the CASE expression.'],
    { orderMatters: true }),

  ex('5.24', 6, 'hard',
    'Revenue by campaign objective',
    'Join Meta daily performance to its campaigns and return `objective`, `spend`, `purchases`, `purchase_value` and `roas`. Order by spend descending.',
    ['meta_ads_daily', 'meta_ads_campaigns'], ['inner-join', 'group-by', 'roas'],
    `SELECT c.objective,
       SUM(d.spend) AS spend,
       SUM(d.purchases) AS purchases,
       SUM(d.purchase_value) AS purchase_value,
       SAFE_DIVIDE(SUM(d.purchase_value), SUM(d.spend)) AS roas
FROM meta_ads_daily d
JOIN meta_ads_campaigns c ON c.campaign_id = d.campaign_id
GROUP BY c.objective
ORDER BY spend DESC`,
    ['Join, group by objective, derive ROAS from the sums.',
      'ROAS is SUM(purchase_value) / SUM(spend): sums first, then divide.'],
    { orderMatters: true }),

  ex('5.25', 6, 'hard',
    'First orders only',
    'Return `first_touch_channel`, `first_orders` and `first_order_revenue` for orders flagged `is_first_order = 1` and completed. Order by first_order_revenue descending.',
    ['orders', 'customers'], ['inner-join', 'group-by', 'where'],
    `SELECT c.first_touch_channel,
       COUNT(*) AS first_orders,
       SUM(o.gross_revenue) AS first_order_revenue
FROM orders o
JOIN customers c ON c.customer_id = o.customer_id
WHERE o.status = 'completed' AND o.is_first_order = 1
GROUP BY c.first_touch_channel
ORDER BY first_order_revenue DESC`,
    ['Two conditions in WHERE, both on the orders table.',
      'Group by the customer attribute.'],
    { orderMatters: true }),

  ex('5.26', 6, 'expert',
    'The spend-to-revenue bridge',
    'How much revenue can we actually attribute? Return one row: `total_revenue` from completed orders, `attributed_revenue` where campaign_id matches a real Google/Meta/LinkedIn campaign, and `unattributed_revenue`, the rest.',
    ['orders', 'google_ads_campaigns', 'meta_ads_campaigns', 'linkedin_ads_campaigns'],
    ['left-join', 'conditional-aggregation', 'attribution', 'null-handling'],
    `SELECT SUM(o.gross_revenue) AS total_revenue,
       SUM(CASE WHEN COALESCE(g.campaign_id, m.campaign_id, l.campaign_id) IS NOT NULL
                THEN o.gross_revenue ELSE 0 END) AS attributed_revenue,
       SUM(CASE WHEN COALESCE(g.campaign_id, m.campaign_id, l.campaign_id) IS NULL
                THEN o.gross_revenue ELSE 0 END) AS unattributed_revenue
FROM orders o
LEFT JOIN google_ads_campaigns g   ON g.campaign_id = o.campaign_id
LEFT JOIN meta_ads_campaigns m     ON m.campaign_id = o.campaign_id
LEFT JOIN linkedin_ads_campaigns l ON l.campaign_id = o.campaign_id
WHERE o.status = 'completed'`,
    ['Three LEFT JOINs so every order survives.',
      'COALESCE across the three right-hand keys: non-NULL means it matched somewhere.',
      'Conditional aggregation splits revenue into the two buckets.'],
    {
      explanation:
        'The unattributed share is the number every CMO eventually asks for and every analyst is uncomfortable reporting. It combines organic revenue, direct revenue, and revenue attributed to campaigns that were deleted. Splitting those three apart is day 13\'s job; admitting the total is day 6\'s.',
    }),

  // ── day 7: the rest of the family ──
  ex('5.27', 7, 'medium',
    'RIGHT JOIN',
    'Using a RIGHT JOIN from `orders` to `customers`, return `segment` and `customers`, a count of distinct customers, including customers with no orders. Order by segment.',
    ['orders', 'customers'], ['right-join', 'group-by'],
    `SELECT c.segment, COUNT(DISTINCT c.customer_id) AS customers
FROM orders o
RIGHT JOIN customers c ON c.customer_id = o.customer_id
GROUP BY c.segment
ORDER BY c.segment`,
    ['RIGHT JOIN keeps everything from the *second* table.',
      'It is the mirror of LEFT JOIN, and you can always rewrite it as one by swapping the tables.'],
    { orderMatters: true,
      explanation: 'RIGHT JOIN is legal and rare. Most teams standardise on LEFT because reading top-to-bottom, "keep everything I started with" is easier to hold in your head than "keep everything I am about to mention".' }),

  ex('5.28', 7, 'medium',
    'FULL OUTER JOIN',
    'Some campaign_ids appear in Google, some in Meta. Return `total_ids`, the count of distinct campaign_ids appearing in either table, using a FULL OUTER JOIN.',
    ['google_ads_campaigns', 'meta_ads_campaigns'], ['full-join'],
    `SELECT COUNT(*) AS total_ids
FROM (
  SELECT COALESCE(g.campaign_id, m.campaign_id) AS campaign_id
  FROM google_ads_campaigns g
  FULL OUTER JOIN meta_ads_campaigns m ON m.campaign_id = g.campaign_id
)`,
    ['FULL OUTER JOIN keeps unmatched rows from both sides.',
      'For unmatched rows one of the two keys is NULL, so COALESCE picks whichever exists.'],
    { explanation: 'FULL OUTER JOIN is the right tool for reconciliation: "what is in system A, what is in system B, and what is in only one of them". It is also the join type most likely to be missing from an older database engine.' }),

  ex('5.29', 7, 'medium',
    'Reconcile two platforms',
    'Return `in_google`, `in_meta` and `in_both`, counts of campaign_ids present in each and in both, using one FULL OUTER JOIN.',
    ['google_ads_campaigns', 'meta_ads_campaigns'], ['full-join', 'conditional-aggregation'],
    `SELECT COUNTIF(g.campaign_id IS NOT NULL) AS in_google,
       COUNTIF(m.campaign_id IS NOT NULL) AS in_meta,
       COUNTIF(g.campaign_id IS NOT NULL AND m.campaign_id IS NOT NULL) AS in_both
FROM google_ads_campaigns g
FULL OUTER JOIN meta_ads_campaigns m ON m.campaign_id = g.campaign_id`,
    ['After a FULL OUTER JOIN, NULL on a side means "absent from that side".',
      'COUNTIF over those NULL tests gives you the three-way split.']),

  ex('5.30', 7, 'medium',
    'SELF JOIN: previous order',
    'For customers, pair each completed order with the customer\'s first order date. Return `order_id`, `order_date` and `first_order_date` for 20 rows, ordered by order_id.',
    ['orders'], ['self-join', 'inner-join'],
    `SELECT o.order_id, o.order_date, f.first_order_date
FROM orders o
JOIN (SELECT customer_id, MIN(order_date) AS first_order_date
      FROM orders WHERE status = 'completed' GROUP BY customer_id) f
  ON f.customer_id = o.customer_id
WHERE o.status = 'completed'
ORDER BY o.order_id
LIMIT 20`,
    ['Join the table to a summary of itself.',
      'The subquery collapses orders to one row per customer.'],
    { orderMatters: true }),

  ex('5.31', 7, 'hard',
    'SELF JOIN: same-day campaigns',
    'Find pairs of Google campaigns in the same country with different channel types. Return `country`, `campaign_a`, `campaign_b`, ordered by country then both names, limit 20. Each pair should appear once.',
    ['google_ads_campaigns'], ['self-join', 'boolean-logic'],
    `SELECT a.country, a.campaign_name AS campaign_a, b.campaign_name AS campaign_b
FROM google_ads_campaigns a
JOIN google_ads_campaigns b
  ON b.country = a.country
 AND b.channel_type != a.channel_type
 AND b.campaign_name > a.campaign_name
ORDER BY a.country, campaign_a, campaign_b
LIMIT 20`,
    ['Join the table to itself with two different aliases.',
      'Without a tie-break condition you get each pair twice, in both orders.',
      '`b.campaign_name > a.campaign_name` keeps exactly one of each pair.'],
    { orderMatters: true,
      trap: 'A self join without an inequality returns every pair twice plus every row paired with itself.' }),

  ex('5.32', 7, 'medium',
    'CROSS JOIN: every combination',
    'Build a scaffold of every combination of the 5 product categories and the 3 device types. Return `category` and `device`, ordered by both. There should be 15 rows.',
    ['products', 'orders'], ['cross-join'],
    `SELECT c.category, d.device
FROM (SELECT DISTINCT category FROM products) c
CROSS JOIN (SELECT DISTINCT device FROM orders) d
ORDER BY c.category, d.device`,
    ['CROSS JOIN pairs every row on the left with every row on the right.',
      'It has no ON clause. That is what makes it a cross join.',
      '5 × 3 = 15 rows.'],
    { orderMatters: true }),

  ex('5.33', 7, 'hard',
    'Date spine with CROSS JOIN',
    'Build a complete daily report for every combination of date in January 2024 and platform. Return `date`, `platform`, `spend`. Zero where there was none. Chronological, then platform.',
    ['date_dim', 'ad_spend_daily'], ['cross-join', 'left-join', 'date-spine'],
    `SELECT d.date, p.platform, COALESCE(SUM(a.spend), 0) AS spend
FROM date_dim d
CROSS JOIN (SELECT DISTINCT platform FROM ad_spend_daily) p
LEFT JOIN ad_spend_daily a ON a.date = d.date AND a.platform = p.platform
WHERE d.date BETWEEN '2024-01-01' AND '2024-01-31'
GROUP BY d.date, p.platform
ORDER BY d.date, p.platform`,
    ['CROSS JOIN dates against platforms to get the complete grid.',
      'LEFT JOIN the actual spend onto that grid, matching on both columns.',
      'COALESCE fills the holes with zero.'],
    { orderMatters: true,
      explanation: 'A spine is a CROSS JOIN of every dimension you want guaranteed, with the facts LEFT JOINed on. It is the only reliable way to get "zero" instead of "missing" in a time series, and the difference matters enormously to a line chart.' }),

  ex('5.34', 7, 'expert',
    'Fan-out: double your revenue by accident',
    'Demonstrate the trap. Return `correct_revenue`. SUM of gross_revenue over completed orders, and `inflated_revenue`, the same SUM after joining to order_items. Then look at the ratio.',
    ['orders', 'order_items'], ['join-fanout', 'inner-join', 'grain'],
    `SELECT
  (SELECT SUM(gross_revenue) FROM orders WHERE status = 'completed') AS correct_revenue,
  (SELECT SUM(o.gross_revenue)
   FROM orders o
   JOIN order_items i ON i.order_id = o.order_id
   WHERE o.status = 'completed') AS inflated_revenue`,
    ['An order with 3 line items becomes 3 rows after the join.',
      'The order-level revenue is repeated on each of those rows, and SUM adds it 3 times.',
      'Two scalar subqueries put both numbers side by side.'],
    {
      explanation:
        'The inflated number is 2.19× the correct one. Note that this is *higher* than the 1.64 average line items per order, because bigger orders tend to have more lines. So the fan-out is weighted towards exactly the rows that hurt most. Nothing errors, nothing warns you. This is the fan-out trap, and it is why the grain question comes before the SQL question. If you must join to a finer grain, either aggregate the fine side first, or sum a column that genuinely lives at the fine grain (like `i.quantity * i.unit_price`).',
      trap: 'Summing a coarse-grain column after joining to a finer grain.',
    }),

  ex('5.35', 7, 'hard',
    'Fan-out, fixed two ways',
    'Return `by_dedup`. Revenue computed with COUNT(DISTINCT)-style dedup via a subquery, and `by_line_items`, revenue summed from the line items themselves. They should be in the same ballpark.',
    ['orders', 'order_items'], ['join-fanout', 'grain', 'sum'],
    `SELECT
  (SELECT SUM(gross_revenue)
   FROM (SELECT DISTINCT order_id, gross_revenue FROM orders WHERE status = 'completed')) AS by_dedup,
  (SELECT SUM(i.quantity * i.unit_price - i.line_discount)
   FROM orders o JOIN order_items i ON i.order_id = o.order_id
   WHERE o.status = 'completed') AS by_line_items`,
    ['The first fix: collapse orders back to one row per order before summing.',
      'The second fix: sum a measure that actually lives at line-item grain.',
      'Both are correct; they answer slightly different questions.'],
    { explanation: 'They will not match exactly, because order-level revenue in this warehouse includes a seasonal uplift that the line items do not carry. That discrepancy is itself the lesson: two "revenue" numbers from the same warehouse can both be defensible and still differ. Know which one your stakeholder means.' }),

  ex('5.36', 7, 'hard',
    'Aggregate before joining',
    'Return `campaign_name`, `spend`, `orders` and `revenue` per Google campaign by aggregating each side to campaign grain before joining. Top 12 by spend.',
    ['google_ads_campaigns', 'google_ads_daily', 'orders'], ['join-fanout', 'left-join', 'group-by'],
    `SELECT c.campaign_name,
       COALESCE(s.spend, 0)   AS spend,
       COALESCE(r.orders, 0)  AS orders,
       COALESCE(r.revenue, 0) AS revenue
FROM google_ads_campaigns c
LEFT JOIN (SELECT campaign_id, SUM(cost) AS spend
           FROM google_ads_daily GROUP BY campaign_id) s ON s.campaign_id = c.campaign_id
LEFT JOIN (SELECT campaign_id, COUNT(*) AS orders, SUM(gross_revenue) AS revenue
           FROM orders WHERE status = 'completed' GROUP BY campaign_id) r ON r.campaign_id = c.campaign_id
ORDER BY spend DESC, c.campaign_name
LIMIT 12`,
    ['Each subquery returns exactly one row per campaign.',
      'Joining two one-row-per-campaign summaries cannot fan out.',
      'COALESCE every measure so missing means zero.'],
    { orderMatters: true }),

  ex('5.37', 7, 'hard',
    'ROAS per campaign',
    'Return `campaign_name`, `spend`, `revenue` and `roas` for Google campaigns with at least 5,000 spend. Order by roas descending.',
    ['google_ads_campaigns', 'google_ads_daily', 'orders'], ['left-join', 'roas', 'having'],
    `SELECT c.campaign_name,
       s.spend,
       COALESCE(r.revenue, 0) AS revenue,
       SAFE_DIVIDE(COALESCE(r.revenue, 0), s.spend) AS roas
FROM google_ads_campaigns c
JOIN (SELECT campaign_id, SUM(cost) AS spend
      FROM google_ads_daily GROUP BY campaign_id HAVING SUM(cost) >= 5000) s
  ON s.campaign_id = c.campaign_id
LEFT JOIN (SELECT campaign_id, SUM(gross_revenue) AS revenue
           FROM orders WHERE status = 'completed' GROUP BY campaign_id) r
  ON r.campaign_id = c.campaign_id
ORDER BY roas DESC, c.campaign_name`,
    ['Put the spend threshold in the subquery\'s HAVING. It is a property of the aggregate.',
      'INNER JOIN the spend (we only want campaigns that spent) but LEFT JOIN the revenue.',
      'ROAS is revenue / spend.'],
    { orderMatters: true }),

  ex('5.38', 7, 'hard',
    'Journeys with their first touch',
    'Return `channel` (the first touch) and `journeys`, the number of converted journeys that started on that channel. Order by journeys descending.',
    ['attribution_touchpoints'], ['inner-join', 'self-join', 'attribution', 'group-by'],
    `SELECT t.channel, COUNT(*) AS journeys
FROM attribution_touchpoints t
WHERE t.touch_position = 1 AND t.converted = 1
GROUP BY t.channel
ORDER BY journeys DESC, t.channel`,
    ['Position 1 is the first touch by definition, no join required.',
      'Recognising when the data already encodes what you need saves a join.'],
    { orderMatters: true }),

  ex('5.39', 7, 'hard',
    'First touch vs last touch, joined',
    'Return `first_channel`, `last_channel` and `journeys` for converted journeys, by joining the touchpoint table to itself on `user_pseudo_id`. Top 15 by journeys.',
    ['attribution_touchpoints'], ['self-join', 'attribution', 'group-by'],
    `SELECT f.channel AS first_channel,
       l.channel AS last_channel,
       COUNT(*) AS journeys
FROM attribution_touchpoints f
JOIN attribution_touchpoints l
  ON l.user_pseudo_id = f.user_pseudo_id
 AND l.touch_position = l.journey_length
WHERE f.touch_position = 1
  AND f.converted = 1
GROUP BY first_channel, last_channel
ORDER BY journeys DESC, first_channel, last_channel
LIMIT 15`,
    ['Alias the same table twice: `f` for first touch, `l` for last.',
      'The last touch is where touch_position equals journey_length.',
      'Join the two aliases on the journey identifier.'],
    { orderMatters: true,
      explanation: 'This one query shows why first-touch and last-touch attribution disagree: the diagonal (same channel both ends) is small, so most conversions are credited to entirely different channels by the two models.' }),

  ex('5.40', 7, 'hard',
    'Products never ordered at all',
    'Return `product_id` and `product_name` for products that appear in no order line. Order by product_id.',
    ['products', 'order_items'], ['anti-join', 'left-join'],
    `SELECT p.product_id, p.product_name
FROM products p
LEFT JOIN order_items i ON i.product_id = p.product_id
WHERE i.product_id IS NULL
ORDER BY p.product_id`,
    ['Anti-join from products to order_items.',
      'If every product has sold, this correctly returns nothing.'],
    { orderMatters: true, allowEmpty: true }),

  ex('5.41', 7, 'hard',
    'Multi-hop: keyword to campaign to spend',
    'Return `campaign_name`, `keywords` (distinct keyword count) and `keyword_spend`. Order by keyword_spend descending, top 10.',
    ['google_ads_keyword_daily', 'google_ads_keywords', 'google_ads_campaigns'],
    ['inner-join', 'group-by', 'distinct'],
    `SELECT c.campaign_name,
       COUNT(DISTINCT k.keyword_id) AS keywords,
       SUM(kd.cost) AS keyword_spend
FROM google_ads_keyword_daily kd
JOIN google_ads_keywords k ON k.keyword_id = kd.keyword_id
JOIN google_ads_campaigns c ON c.campaign_id = k.campaign_id
GROUP BY c.campaign_name
ORDER BY keyword_spend DESC, c.campaign_name
LIMIT 10`,
    ['Two hops: daily → keyword → campaign.',
      'COUNT(DISTINCT keyword_id) because each keyword contributes many daily rows.'],
    { orderMatters: true }),

  ex('5.42', 7, 'hard',
    'Sessions that led to orders',
    'Return `channel_group`, `sessions` and `converting_sessions` from `ga4_sessions`, plus `cvr`. Exclude QA traffic. Order by sessions descending.',
    ['ga4_sessions'], ['group-by', 'rate-metrics', 'conditional-aggregation'],
    `SELECT channel_group,
       COUNT(*) AS sessions,
       COUNTIF(converted = 1) AS converting_sessions,
       SAFE_DIVIDE(COUNTIF(converted = 1), COUNT(*)) AS cvr
FROM ga4_sessions
WHERE source != 'internal-qa'
GROUP BY channel_group
ORDER BY sessions DESC, channel_group`,
    ['COUNTIF for the conditional count.',
      'The rate divides the two.'],
    { orderMatters: true }),

  ex('5.43', 7, 'hard',
    'Accounts with no opportunities',
    'Return `account_id`, `account_name` and `tier` for Salesforce accounts with no opportunities at all. Order by account_id, limit 20.',
    ['salesforce_accounts', 'salesforce_opportunities'], ['anti-join', 'left-join'],
    `SELECT a.account_id, a.account_name, a.tier
FROM salesforce_accounts a
LEFT JOIN salesforce_opportunities o ON o.account_id = a.account_id
WHERE o.opportunity_id IS NULL
ORDER BY a.account_id
LIMIT 20`,
    ['Anti-join on the account key.',
      'LEFT JOIN opportunities, then keep rows where opportunity_id came back NULL.'],
    { orderMatters: true }),

  ex('5.44', 7, 'hard',
    'Subscription revenue reconciliation',
    'Return `subscription_id`, `mrr` and `charged` (total succeeded charge amount) for the 20 active subscriptions with the largest charged total. Include subscriptions with no charges yet.',
    ['subscriptions', 'stripe_charges'], ['left-join', 'group-by'],
    `SELECT s.subscription_id,
       s.mrr,
       COALESCE(SUM(CASE WHEN c.status = 'succeeded' THEN c.amount ELSE 0 END), 0) AS charged
FROM subscriptions s
LEFT JOIN stripe_charges c ON c.subscription_id = s.subscription_id
WHERE s.status = 'active'
GROUP BY s.subscription_id, s.mrr
ORDER BY charged DESC, s.subscription_id
LIMIT 20`,
    ['LEFT JOIN so subscriptions with no charges survive.',
      'Filter the charge status inside the aggregate with CASE, not in WHERE. A WHERE would drop the unmatched rows.'],
    { orderMatters: true,
      explanation: 'Conditional aggregation is the third way to filter an outer join safely, alongside putting the condition in ON. Both preserve the left side; a WHERE would not.' }),

  ex('5.45', 7, 'expert',
    'Complete daily report with no gaps',
    'Build the report a stakeholder can actually read: for every day in November 2024, return `date`, `spend`, `orders` and `revenue`, with zeros where nothing happened. Chronological.',
    ['date_dim', 'ad_spend_daily', 'orders'], ['date-spine', 'left-join', 'join-fanout', 'group-by'],
    `SELECT d.date,
       COALESCE(s.spend, 0)   AS spend,
       COALESCE(o.orders, 0)  AS orders,
       COALESCE(o.revenue, 0) AS revenue
FROM date_dim d
LEFT JOIN (SELECT date, SUM(spend) AS spend FROM ad_spend_daily GROUP BY date) s
       ON s.date = d.date
LEFT JOIN (SELECT order_date, COUNT(*) AS orders, SUM(gross_revenue) AS revenue
           FROM orders WHERE status = 'completed' GROUP BY order_date) o
       ON o.order_date = d.date
WHERE d.date BETWEEN '2024-11-01' AND '2024-11-30'
ORDER BY d.date`,
    ['Spine first, then aggregate each fact to daily grain, then LEFT JOIN both.',
      'Joining the two fact tables to each other directly would fan out badly.',
      'Filter on the spine\'s date so the range is guaranteed complete.'],
    { orderMatters: true,
      explanation: 'This is the canonical shape of a daily marketing report, and every element is load-bearing: the spine guarantees 30 rows, pre-aggregation prevents fan-out, and COALESCE turns absence into zero.' }),

  ex('5.46', 7, 'expert',
    'Channel P&L',
    'Per `channel`, return `orders`, `revenue`, `cogs`, `gross_profit` and `margin_pct` from completed orders. Order by gross_profit descending.',
    ['orders'], ['group-by', 'rate-metrics', 'safe-divide'],
    `SELECT channel,
       COUNT(*) AS orders,
       SUM(gross_revenue) AS revenue,
       SUM(cogs) AS cogs,
       SUM(gross_revenue) - SUM(cogs) AS gross_profit,
       SAFE_DIVIDE(SUM(gross_revenue) - SUM(cogs), SUM(gross_revenue)) AS margin_pct
FROM orders
WHERE status = 'completed'
GROUP BY channel
ORDER BY gross_profit DESC`,
    ['Gross profit is revenue minus COGS, both summed first.',
      'Margin percentage divides the profit by the revenue: again, sums before division.'],
    { orderMatters: true,
      explanation: 'Ranking channels by revenue and by gross profit gives different orders, because AOV and product mix differ by channel. Media budgets should follow profit, not revenue.' }),

  ex('5.47', 7, 'expert',
    'Which campaigns drive first orders',
    'Return `campaign_name`, `first_orders`, `repeat_orders` and `first_order_share` for Google campaigns with at least 20 attributed completed orders. Order by first_order_share descending.',
    ['orders', 'google_ads_campaigns'], ['inner-join', 'conditional-aggregation', 'having'],
    `SELECT c.campaign_name,
       COUNTIF(o.is_first_order = 1) AS first_orders,
       COUNTIF(o.is_first_order = 0) AS repeat_orders,
       SAFE_DIVIDE(COUNTIF(o.is_first_order = 1), COUNT(*)) AS first_order_share
FROM orders o
JOIN google_ads_campaigns c ON c.campaign_id = o.campaign_id
WHERE o.status = 'completed'
GROUP BY c.campaign_name
HAVING COUNT(*) >= 20
ORDER BY first_order_share DESC, c.campaign_name`,
    ['COUNTIF twice with opposite conditions splits the orders.',
      'HAVING enforces the minimum volume so the share is meaningful.'],
    { orderMatters: true,
      explanation: 'A campaign with a high first-order share is acquiring; one with a low share is harvesting demand you already had. Brand campaigns sit at the bottom of this list, and that is exactly the argument for why their apparent ROAS is misleading.' }),

  ex('5.48', 7, 'expert',
    'Cross join for a cohort scaffold',
    'Build the empty cohort grid: every combination of the 12 signup months in 2024 and month numbers 0 through 11. Return `cohort_month` and `month_number`, ordered by both. 144 rows.',
    ['date_dim'], ['cross-join', 'date-spine', 'cohort'],
    `SELECT m.cohort_month, n.month_number
FROM (SELECT DISTINCT month_start AS cohort_month FROM date_dim) m
CROSS JOIN (SELECT DISTINCT quarter - 1 + offsets.n AS month_number
            FROM date_dim, (SELECT 0 AS n UNION ALL SELECT 4 UNION ALL SELECT 8) offsets
            WHERE quarter BETWEEN 1 AND 4) n
WHERE n.month_number BETWEEN 0 AND 11
ORDER BY m.cohort_month, n.month_number`,
    ['You need two lists: the 12 cohort months, and the numbers 0–11.',
      'The months come from `date_dim.month_start`.',
      'The numbers can be built from any table that yields 12 distinct values: or with UNNEST(GENERATE_ARRAY(0, 11)) once you reach day 11.'],
    { orderMatters: true,
      explanation: 'A cohort table is a CROSS JOIN scaffold with actuals LEFT JOINed on. Building the scaffold separately is what guarantees the triangle has no holes, and holes in a cohort chart are indistinguishable from zeros unless you built the grid.' }),

  ex('5.49', 7, 'expert',
    'The join type decision table',
    'One row, four numbers, four join types against the same pair of tables. Return `inner_rows`, `left_rows`, `right_rows` and `full_rows`. The row count produced by joining `google_ads_campaigns` to `orders` on campaign_id with each join type.',
    ['google_ads_campaigns', 'orders'], ['inner-join', 'left-join', 'right-join', 'full-join'],
    `SELECT
  (SELECT COUNT(*) FROM google_ads_campaigns c JOIN orders o ON o.campaign_id = c.campaign_id) AS inner_rows,
  (SELECT COUNT(*) FROM google_ads_campaigns c LEFT JOIN orders o ON o.campaign_id = c.campaign_id) AS left_rows,
  (SELECT COUNT(*) FROM google_ads_campaigns c RIGHT JOIN orders o ON o.campaign_id = c.campaign_id) AS right_rows,
  (SELECT COUNT(*) FROM google_ads_campaigns c FULL OUTER JOIN orders o ON o.campaign_id = c.campaign_id) AS full_rows`,
    ['Four scalar subqueries, identical except for the join keyword.',
      'Predict the four numbers before you run it.'],
    {
      explanation:
        'INNER ≤ LEFT ≤ FULL and INNER ≤ RIGHT ≤ FULL, always. The gap between INNER and LEFT is the number of campaigns with no orders; between INNER and RIGHT, the number of orders with no matching campaign. Those two gaps are usually the interesting part of the analysis, not a nuisance.',
    }),

  ex('5.50', 7, 'expert',
    'Full channel report, joins done right',
    'The report that uses everything: per `first_touch_channel`, return `customers`, `orders`, `revenue`, `avg_order_value` and `orders_per_customer`, including channels with no orders. Order by revenue descending.',
    ['customers', 'orders'], ['left-join', 'join-fanout', 'group-by', 'rate-metrics'],
    `SELECT c.first_touch_channel,
       COUNT(DISTINCT c.customer_id) AS customers,
       COALESCE(o.orders, 0) AS orders,
       COALESCE(o.revenue, 0) AS revenue,
       SAFE_DIVIDE(o.revenue, o.orders) AS avg_order_value,
       SAFE_DIVIDE(o.orders, COUNT(DISTINCT c.customer_id)) AS orders_per_customer
FROM customers c
LEFT JOIN (SELECT cu.first_touch_channel,
                  COUNT(*) AS orders,
                  SUM(ord.gross_revenue) AS revenue
           FROM orders ord
           JOIN customers cu ON cu.customer_id = ord.customer_id
           WHERE ord.status = 'completed'
           GROUP BY cu.first_touch_channel) o
       ON o.first_touch_channel = c.first_touch_channel
GROUP BY c.first_touch_channel, o.orders, o.revenue
ORDER BY revenue DESC, c.first_touch_channel`,
    ['Aggregate the order side to channel grain first so it cannot fan out the customer count.',
      'Then LEFT JOIN that summary onto the customer table and count customers distinctly.',
      'Both derived rates come from columns already in the row.'],
    { orderMatters: true,
      explanation: 'Orders per customer is the metric this report exists for. Revenue tells you which channel is biggest; orders-per-customer tells you which one brings people who come back, and those are rarely the same channel.' }),
];
