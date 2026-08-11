import type { DayContent } from '../types';
import { p, h, list, key, call, sql, compare, mcq, predict, debug, explain, order, task } from './helpers';

export const DAYS_06_10: DayContent[] = [
  // ══════════════════════════════════════════════════════════ DAY 6 ══
  {
    day: 6,
    module: 5,
    moduleTitle: 'JOINs',
    title: 'INNER and LEFT, and the filter that breaks one of them',
    subtitle: 'Putting tables back together',
    objective:
      'Join tables correctly, and know where a filter belongs so a LEFT JOIN stays a LEFT JOIN.',
    estimatedMinutes: 95,
    concepts: ['inner-join', 'left-join', 'anti-join', 'null-handling'],
    theory: [
      h('Why joins exist'),
      p(
        'Day 1 split the data apart to avoid repeating it. A join puts it back together for the ' +
        'length of one query. You need two things: the other table, and the condition linking them.',
      ),
      sql(
        `SELECT c.campaign_name, SUM(d.cost) AS spend
FROM google_ads_daily d
JOIN google_ads_campaigns c ON c.campaign_id = d.campaign_id
GROUP BY c.campaign_name
ORDER BY spend DESC
LIMIT 5`,
        'The fact-to-dimension join: numbers from the fact, labels from the dimension.',
      ),
      h('INNER keeps matches; LEFT keeps everything on the left'),
      p(
        '`INNER JOIN` returns only rows that match on both sides, and silently deletes ' +
        'everything that does not. `LEFT JOIN` keeps every row from the left table, filling the ' +
        'right side with NULLs where nothing matched.',
      ),
      key(
        'The choice between INNER and LEFT is the choice between "products that sold" and "all ' +
        'products, with their sales". Only the second can answer "what is not selling?"',
      ),
      h('The bug that costs the most'),
      p(
        'A condition on the *right-hand* table of a LEFT JOIN belongs in `ON`. Put it in `WHERE` ' +
        'and the unmatched rows, which have NULL in every right-hand column, fail the test and ' +
        'get dropped. Your LEFT JOIN has silently become an INNER JOIN.',
      ),
      compare(
        'Broken, becomes an INNER JOIN',
        "FROM campaigns c\nLEFT JOIN orders o ON o.campaign_id = c.campaign_id\nWHERE o.status = 'completed'",
        'Correct, stays a LEFT JOIN',
        "FROM campaigns c\nLEFT JOIN orders o\n  ON o.campaign_id = c.campaign_id\n AND o.status = 'completed'",
        'In this warehouse the first returns 22 campaigns and the second returns 24. Nothing errors. The two campaigns you lose are the ones with spend and no orders, exactly the ones worth investigating.',
      ),
      h('The anti-join'),
      p(
        '`LEFT JOIN … WHERE right.key IS NULL` keeps exactly the left rows that matched nothing. ' +
        'It is not a join type, it is a pattern, and it is how you ask "which of these has none ' +
        'of those?": campaigns with no orders, customers who never bought, products never sold.',
      ),
      call(
        'info',
        'COUNT(*) lies on the outer side of a LEFT JOIN',
        'An unmatched left row still produces one row after the join, so `COUNT(*)` reports 1 ' +
        'for a group that has nothing. Count a right-hand column instead: `COUNT(o.order_id)` ' +
        'skips the NULL and gives 0.',
      ),
      h('Aggregate before you join'),
      p(
        'Joining two fact tables directly multiplies them together. The fix is almost always to ' +
        'collapse each side to a common grain *first*, then join two summaries that cannot fan ' +
        'out. You will meet the damage properly tomorrow.',
      ),
    ],
    visual: {
      kind: 'join-visualizer',
      title: 'Six join types, animated',
      caption:
        'Two row-sets side by side. Pick a join type and watch rows slide into the result, with ' +
        'unmatched rows fading to NULL-filled ghosts.',
    },
    examples: [
      {
        title: 'Every product, including the ones that never sold',
        question: 'What is not selling?',
        sql: `SELECT p.product_name, COALESCE(SUM(i.quantity), 0) AS units
FROM products p
LEFT JOIN order_items i ON i.product_id = p.product_id
GROUP BY p.product_name
ORDER BY units, p.product_name
LIMIT 8`,
        takeaway:
          'Start FROM the table you want all of. COALESCE turns the NULL sum into the 0 a ' +
          'stakeholder expects.',
      },
      {
        title: 'Campaigns with spend and no orders',
        question: 'Which campaigns produced nothing?',
        sql: `SELECT c.campaign_id, c.campaign_name
FROM google_ads_campaigns c
LEFT JOIN orders o ON o.campaign_id = c.campaign_id
WHERE o.campaign_id IS NULL
ORDER BY c.campaign_id`,
        takeaway:
          'The video and display prospecting campaigns. They are bought on view-through, so ' +
          'zero last-click orders is expected, but an INNER JOIN would have hidden them entirely.',
      },
      {
        title: 'Aggregate each side, then join',
        question: 'Spend and revenue per campaign, without fan-out.',
        sql: `WITH spend AS (
  SELECT campaign_id, SUM(cost) AS spend FROM google_ads_daily GROUP BY campaign_id
), revenue AS (
  SELECT campaign_id, SUM(gross_revenue) AS revenue FROM orders
  WHERE status = 'completed' AND campaign_id IS NOT NULL GROUP BY campaign_id
)
SELECT c.campaign_name, s.spend, COALESCE(r.revenue, 0) AS revenue
FROM spend s
JOIN google_ads_campaigns c USING (campaign_id)
LEFT JOIN revenue r USING (campaign_id)
ORDER BY s.spend DESC
LIMIT 8`,
        takeaway:
          'Both CTEs are one row per campaign, so joining them cannot multiply anything. This ' +
          'shape is the answer to most fan-out problems.',
      },
    ],
    playground: {
      prompt:
        'Take the campaign/orders LEFT JOIN and move the status condition between ON and WHERE. ' +
        'Count the distinct campaigns each way and confirm you get 24 and 22.',
      starter: `SELECT COUNT(DISTINCT c.campaign_id) AS campaigns
FROM google_ads_campaigns c
LEFT JOIN orders o ON o.campaign_id = c.campaign_id AND o.status = 'completed'`,
    },
    practice: ['5.1', '5.2', '5.3', '5.4', '5.5', '5.6', '5.7', '5.8', '5.9', '5.11',
      '5.12', '5.13', '5.14', '5.17'],
    quiz: [
      mcq('d6q1', 'Where does a filter on the right table of a LEFT JOIN belong?',
        ['WHERE', 'ON', 'Either. They are equivalent', 'HAVING'],
        1,
        'In WHERE it tests NULL for unmatched rows, fails, and silently converts the LEFT JOIN into an INNER JOIN.'),
      predict('d6q2', 'products has 24 rows. What does this return?',
        `SELECT COUNT(*) FROM products p LEFT JOIN order_items i ON i.product_id = p.product_id`,
        ['24', 'The number of order_items rows, or more', '0', '48'],
        1,
        'Each product appears once per matching line item. A LEFT JOIN to a finer grain fans out. That is tomorrow\'s lesson.'),
      debug('d6q3', 'This should show all channels including those with no orders, but it does not.',
        `SELECT c.first_touch_channel, COUNT(*) AS orders
FROM customers c
LEFT JOIN orders o ON o.customer_id = c.customer_id
WHERE o.status = 'completed'
GROUP BY c.first_touch_channel`,
        ['COUNT(*) should be COUNT(o.order_id)',
          'The status filter should be in ON, not WHERE',
          'Both of the above',
          'The join key is wrong'],
        2,
        'The WHERE kills the outer join, and COUNT(*) would report 1 for empty groups even after that is fixed.'),
      mcq('d6q4', 'How do you find campaigns with no attributed orders?',
        ['INNER JOIN and check for zero',
          'LEFT JOIN, then WHERE the right-hand key IS NULL',
          'RIGHT JOIN',
          'GROUP BY with HAVING COUNT(*) = 0'],
        1,
        'The anti-join pattern. HAVING COUNT(*) = 0 cannot work, because a group with no rows does not exist to be counted.'),
    ],
    assessment: {
      passScore: 0.7,
      timeLimitSec: 900,
      questions: [
        mcq('d6a1', 'An INNER JOIN between orders and campaigns returns fewer orders than the orders table has. Why?',
          ['The join key is wrong',
            'Some orders reference campaigns that do not exist, or have no campaign at all',
            'INNER JOIN deduplicates',
            'The campaigns table is too small'],
          1,
          'Orphaned and NULL foreign keys both disappear from an INNER JOIN, silently. In this warehouse that is thousands of orders.'),
        mcq('d6a2', 'Why use COUNT(o.order_id) instead of COUNT(*) after a LEFT JOIN?',
          ['It is faster',
            'COUNT(*) counts the NULL-filled unmatched row as 1',
            'COUNT(*) is not allowed after a join',
            'They are identical'],
          1,
          'COUNT(col) skips NULLs, so a group with no matches correctly reports 0.'),
        explain('d6a3', 'What does this pattern do?',
          `FROM products p LEFT JOIN order_items i ON i.product_id = p.product_id
WHERE i.product_id IS NULL`,
          ['Finds products with NULL ids',
            'Finds products that appear in no order line, an anti-join',
            'Removes duplicates',
            'Errors, because you cannot filter on a NULL from a join'],
          1,
          'LEFT JOIN then IS NULL on the right side is the standard anti-join.'),
      ],
      exerciseIds: ['5.10', '5.18'],
    },
    challenge: '5.26',
    reflection: [
      'Find a LEFT JOIN in a query you own. Is every right-table condition in the ON clause?',
      'Which "which of these has none of those" question would be useful at your work?',
      'What would an INNER JOIN be silently deleting from your main reporting table?',
    ],
    project: {
      title: 'Spend-to-revenue bridge',
      brief:
        'Join ad spend to orders and quantify how much revenue has no attributable campaign, ' +
        'the number every CMO eventually asks for.',
      tasks: [
        task('bridge-total', 'The attribution gap',
          'Return `total_revenue`, `attributed_revenue` and `unattributed_revenue` for completed orders, where attributed means the campaign_id matches a real Google, Meta or LinkedIn campaign.',
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
            'COALESCE across the three keys: non-NULL means it matched somewhere.']),
        task('bridge-by-campaign', 'Spend and revenue per campaign',
          'Return `campaign_name`, `spend` and `revenue` for the top 12 Google campaigns by spend, including any with no revenue.',
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
LIMIT 12`,
          ['Aggregate each side to campaign grain before joining.',
            'COALESCE every measure so missing means zero.'],
          { orderMatters: true }),
      ],
    },
  },

  // ══════════════════════════════════════════════════════════ DAY 7 ══
  {
    day: 7,
    module: 5,
    moduleTitle: 'JOINs',
    title: 'The rest of the family, and the 2.19× revenue bug',
    subtitle: 'RIGHT, FULL, SELF, CROSS, and fan-out',
    objective:
      'Recognise fan-out before it happens, and build a date spine so no day goes missing.',
    estimatedMinutes: 95,
    concepts: ['right-join', 'full-join', 'self-join', 'cross-join', 'join-fanout', 'date-spine'],
    theory: [
      h('The remaining join types'),
      list([
        '**RIGHT JOIN**, the mirror of LEFT. Legal, rare, and usually clearer rewritten as a LEFT with the tables swapped.',
        '**FULL OUTER JOIN**, keeps unmatched rows from both sides. The reconciliation join: "what is in A, what is in B, what is in only one?"',
        '**SELF JOIN**, a table joined to itself with two aliases. Needs an inequality or you get every pair twice plus every row paired with itself.',
        '**CROSS JOIN**: every row on the left paired with every row on the right, with no ON clause at all.',
      ]),
      h('Fan-out: the expensive one'),
      p(
        'Join `orders` to `order_items` and an order with three lines becomes three rows. The ' +
        'order-level revenue is repeated on each, and `SUM(orders.gross_revenue)` adds it three ' +
        'times.',
      ),
      call(
        'money',
        '965,128 becomes 2,114,146',
        'That is 2.19×: and notice it is *higher* than the 1.64 average lines per order, ' +
        'because bigger orders tend to have more lines. The fan-out is weighted towards exactly ' +
        'the rows that hurt most. Nothing errors. Nothing warns you.',
      ),
      key(
        'If you must join across a grain change, either aggregate the fine side first, or sum a ' +
        'measure that genuinely lives at the fine grain.',
      ),
      compare(
        'Wrong',
        "SELECT SUM(o.gross_revenue)\nFROM orders o\nJOIN order_items i USING (order_id)\nWHERE o.status = 'completed'",
        'Right',
        "SELECT SUM(i.quantity * i.unit_price\n           - i.line_discount)\nFROM order_items i\nJOIN orders o USING (order_id)\nWHERE o.status = 'completed'",
        'The second sums a line-item measure at line-item grain. Both queries have the same FROM; only the measure changed.',
      ),
      h('CROSS JOIN and the date spine'),
      p(
        'A deliberate CROSS JOIN builds a scaffold. Cross the calendar against your dimensions, ' +
        'LEFT JOIN the facts onto it, and COALESCE the holes to zero. Now a day with no activity ' +
        'is a zero rather than a missing row.',
      ),
      call(
        'trap',
        'Missing and zero look identical on a line chart',
        'Without a spine, a day with no spend simply has no row, the chart draws a straight line ' +
        'across the gap, and nobody notices the campaign was switched off for a week.',
      ),
    ],
    visual: {
      kind: 'fanout',
      title: 'Watch revenue inflate',
      caption:
        'One order with three line items, joined and summed. The revenue counter triples in ' +
        'front of you, and nothing goes red.',
    },
    examples: [
      {
        title: 'The fan-out, measured',
        question: 'How much does the wrong join inflate revenue?',
        sql: `SELECT
  (SELECT SUM(gross_revenue) FROM orders WHERE status = 'completed') AS correct,
  (SELECT SUM(o.gross_revenue) FROM orders o
   JOIN order_items i ON i.order_id = o.order_id
   WHERE o.status = 'completed') AS inflated`,
        takeaway: '2.19×. Two queries with the same intent and a factor of two between them.',
      },
      {
        title: 'A complete daily report',
        question: 'Every day of November, including the quiet ones.',
        sql: `SELECT d.date,
       COALESCE(s.spend, 0) AS spend,
       COALESCE(o.revenue, 0) AS revenue
FROM date_dim d
LEFT JOIN (SELECT date, SUM(spend) AS spend FROM ad_spend_daily GROUP BY date) s ON s.date = d.date
LEFT JOIN (SELECT order_date, SUM(gross_revenue) AS revenue FROM orders
           WHERE status = 'completed' GROUP BY order_date) o ON o.order_date = d.date
WHERE d.date BETWEEN '2024-11-01' AND '2024-11-07'
ORDER BY d.date`,
        takeaway:
          'Spine first, aggregate each fact to daily grain, LEFT JOIN both. Every element is ' +
          'load-bearing: the spine guarantees the rows, pre-aggregation prevents fan-out.',
      },
      {
        title: 'First touch and last touch, from one table',
        question: 'Which channels open journeys, and which close them?',
        sql: `SELECT f.channel AS first_channel, l.channel AS last_channel, COUNT(*) AS journeys
FROM attribution_touchpoints f
JOIN attribution_touchpoints l
  ON l.user_pseudo_id = f.user_pseudo_id
 AND l.touch_position = l.journey_length
WHERE f.touch_position = 1 AND f.converted = 1
GROUP BY first_channel, last_channel
ORDER BY journeys DESC
LIMIT 8`,
        takeaway:
          'A self join with two aliases. The off-diagonal cells are why first-touch and ' +
          'last-touch attribution disagree so violently.',
      },
    ],
    playground: {
      prompt:
        'Reproduce the fan-out, then fix it two ways: deduplicate the orders before summing, and ' +
        'sum a line-item measure instead. Notice the two fixes give slightly different answers, ' +
        'and work out why.',
      starter: `SELECT COUNT(*) AS rows_after_join
FROM orders o JOIN order_items i ON i.order_id = o.order_id
WHERE o.status = 'completed'`,
    },
    practice: ['5.27', '5.28', '5.29', '5.30', '5.31', '5.32', '5.33', '5.35', '5.36',
      '5.37', '5.40', '5.42'],
    quiz: [
      predict('d7q1', 'orders has 6,610 rows, order_items has 10,834. Roughly how many rows does an inner join produce?',
        'SELECT COUNT(*) FROM orders o JOIN order_items i ON i.order_id = o.order_id',
        ['6,610', 'About 10,900: one per line item, plus a few from duplicate orders',
          '71 million', '10,834 exactly'],
        1,
        'Each line item matches its order, so the result is roughly line-item count. The extra comes from the 26 duplicated orders each matching their lines twice.'),
      mcq('d7q2', 'What is the safest fix for fan-out?',
        ['Add DISTINCT',
          'Aggregate each side to a common grain before joining',
          'Use a LEFT JOIN instead',
          'Add a LIMIT'],
        1,
        'DISTINCT can work for exact duplicates but is fragile. Pre-aggregation removes the possibility entirely.'),
      mcq('d7q3', 'Why does a self join need an inequality in the ON clause?',
        ['To make it faster',
          'Otherwise you get every pair twice plus every row paired with itself',
          'SQL requires it',
          'To avoid NULLs'],
        1,
        '`b.key > a.key` keeps exactly one of each unordered pair and excludes self-pairs.'),
      mcq('d7q4', 'What does a date spine guarantee?',
        ['Faster queries',
          'That every calendar day appears, as a zero rather than a missing row',
          'Correct time zones',
          'Deduplicated dates'],
        1,
        'Missing and zero look identical on a chart and mean completely different things.'),
    ],
    assessment: {
      passScore: 0.7,
      timeLimitSec: 900,
      questions: [
        mcq('d7a1', 'Your revenue report reads 2.19× the finance number. Most likely cause?',
          ['Refunds are included',
            'An order-level column is being summed after joining to line items',
            'The date range is wrong',
            'Duplicate customers'],
          1,
          'That exact ratio is the fan-out signature in this warehouse. Check the grain of every measure against the grain of the FROM.'),
        order('d7a2', 'Put the steps of a gap-free daily report in order.',
          ['Start FROM the date dimension',
            'Aggregate each fact table to daily grain',
            'LEFT JOIN the aggregates onto the spine',
            'COALESCE the gaps to zero'],
          'Spine, pre-aggregate, join, fill. Doing it in any other order reintroduces either gaps or fan-out.'),
        mcq('d7a3', 'When is a CROSS JOIN the right tool?',
          ['Never',
            'When you deliberately need every combination, a scaffold or a date spine',
            'When the join key is missing',
            'For deduplication'],
          1,
          'Accidental cross joins come from a missing ON clause and never finish. Deliberate ones build scaffolds.'),
      ],
      exerciseIds: ['5.34', '5.45'],
    },
    challenge: '5.50',
    reflection: [
      'Which report at your work joins two fact tables? Does it aggregate first?',
      'Does your main time-series chart use a spine, or does it silently skip empty days?',
      'What would a FULL OUTER JOIN reconcile between two of your systems?',
    ],
    project: {
      title: 'Complete daily report with no missing days',
      brief:
        'Build the daily report a stakeholder can read without wondering whether a gap means ' +
        'zero or means broken.',
      tasks: [
        task('daily-spine', 'The gap-free report',
          'For every day in November 2024, return `date`, `spend`, `orders` and `revenue`, with zeros where nothing happened. Chronological.',
          `SELECT d.date,
       COALESCE(s.spend, 0)   AS spend,
       COALESCE(o.orders, 0)  AS orders,
       COALESCE(o.revenue, 0) AS revenue
FROM date_dim d
LEFT JOIN (SELECT date, SUM(spend) AS spend FROM ad_spend_daily GROUP BY date) s ON s.date = d.date
LEFT JOIN (SELECT order_date, COUNT(*) AS orders, SUM(gross_revenue) AS revenue
           FROM orders WHERE status = 'completed' GROUP BY order_date) o ON o.order_date = d.date
WHERE d.date BETWEEN '2024-11-01' AND '2024-11-30'
ORDER BY d.date`,
          ['Spine first, then aggregate each fact to daily grain.',
            'Filter on the spine\'s date so the range is guaranteed complete.'],
          { orderMatters: true }),
        task('daily-grid', 'Platform × day grid',
          'Every combination of date and platform for the first week of October, with spend defaulting to zero. Order by date then platform.',
          `SELECT d.date, pl.platform, COALESCE(SUM(a.spend), 0) AS spend
FROM date_dim d
CROSS JOIN (SELECT DISTINCT platform FROM ad_spend_daily) pl
LEFT JOIN ad_spend_daily a ON a.date = d.date AND a.platform = pl.platform
WHERE d.date BETWEEN '2024-10-01' AND '2024-10-07'
GROUP BY d.date, pl.platform
ORDER BY d.date, pl.platform`,
          ['CROSS JOIN dates against platforms for the complete grid.',
            'LEFT JOIN the actuals onto it, matching on both columns.'],
          { orderMatters: true }),
      ],
    },
  },

  // ══════════════════════════════════════════════════════════ DAY 8 ══
  {
    day: 8,
    module: 6,
    moduleTitle: 'Shaping data',
    title: 'CASE, dates, strings, math and NULLs',
    subtitle: 'Turning columns into the dimensions you actually need',
    objective:
      'Create dimensions that do not exist in the schema, and handle every missing value ' +
      'deliberately.',
    estimatedMinutes: 100,
    concepts: ['case-when', 'conditional-aggregation', 'date-functions', 'string-functions',
      'regexp', 'coalesce', 'null-handling'],
    theory: [
      h('CASE: the conditional'),
      p(
        '`CASE WHEN cond THEN x ELSE y END` is an expression, so it goes anywhere a value goes, ' +
        'SELECT, WHERE, GROUP BY, ORDER BY, even inside an aggregate. Branches are evaluated top ' +
        'to bottom and the first match wins, so later branches need only an upper bound.',
      ),
      h('CASE inside an aggregate is a pivot'),
      p(
        '`SUM(CASE WHEN device = \'mobile\' THEN revenue ELSE 0 END)` gives you mobile revenue as ' +
        'a column. Repeat it per device and you have turned rows into columns. Everything a ' +
        'spreadsheet pivot table does is this, plus a GROUP BY.',
      ),
      key('Conditional aggregation is the single most useful pattern in analytical SQL.'),
      h('Dates'),
      list([
        '`DATE_TRUNC(date, MONTH)`. Snap back to the start of the period.',
        '`DATE_DIFF(later, earlier, DAY)`, **the later date comes first**.',
        '`DATE_ADD(date, INTERVAL 30 DAY)`. Note the INTERVAL keyword.',
        '`EXTRACT(part FROM date)`, pull out one component; DAYOFWEEK is 1 for Sunday.',
        '`PARSE_DATE` / `FORMAT_DATE`, text to date and back.',
      ]),
      call(
        'trap',
        'Never sort by a formatted date',
        '`FORMAT_DATE(\'%b %Y\', d)` gives you "Jun 2024", and sorting that alphabetically puts ' +
        'April first. Format for display, sort by the underlying date.',
      ),
      h('Strings: naming conventions are a schema'),
      p(
        '`GB_Search_NonBrand_UK_Exact` contains five dimensions that do not exist as columns. ' +
        '`SPLIT(name, \'_\')[OFFSET(0)]` extracts the first; `REGEXP_EXTRACT` handles the messier ' +
        'cases. Use `SAFE_OFFSET` for segments that might not be there, because one day someone ' +
        'will name a campaign differently.',
      ),
      h('NULL handling, deliberately'),
      p(
        '`COALESCE(a, b, c)` returns the first non-NULL. `IFNULL(a, b)` is the two-argument ' +
        'version. `NULLIF(a, b)` returns NULL when a equals b, useful for turning a zero ' +
        'denominator into a NULL rather than an error.',
      ),
      call(
        'warn',
        'Ask what the default means',
        '`COALESCE(quality_score, 0)` turns "we have not measured this keyword" into "this ' +
        'keyword scores zero". Those are different statements, and only one of them is true.',
      ),
    ],
    visual: {
      kind: 'case-pivot',
      title: 'Rows becoming columns',
      caption:
        'A long table of channel × device revenue folding into a wide pivot, one SUM(CASE …) at a time.',
    },
    examples: [
      {
        title: 'Pivot revenue by device',
        question: 'How does device split differ by channel?',
        sql: `SELECT channel,
       SUM(CASE WHEN device = 'mobile'  THEN gross_revenue ELSE 0 END) AS mobile,
       SUM(CASE WHEN device = 'desktop' THEN gross_revenue ELSE 0 END) AS desktop,
       SUM(CASE WHEN device = 'tablet'  THEN gross_revenue ELSE 0 END) AS tablet
FROM orders WHERE status = 'completed'
GROUP BY channel
ORDER BY channel`,
        takeaway: 'Put the CASE *inside* the SUM. Outside it, you would filter rather than pivot.',
      },
      {
        title: 'Parse a campaign name',
        question: 'Get five dimensions out of one string.',
        sql: `SELECT campaign_name,
       SPLIT(campaign_name, '_')[OFFSET(0)] AS market,
       SPLIT(campaign_name, '_')[OFFSET(1)] AS channel,
       SPLIT(campaign_name, '_')[OFFSET(2)] AS brandness,
       SPLIT(campaign_name, '_')[SAFE_OFFSET(4)] AS match_type
FROM google_ads_campaigns
ORDER BY campaign_name
LIMIT 8`,
        takeaway:
          'SAFE_OFFSET is the difference between a parser that works and one that dies the first ' +
          'time someone breaks the convention.',
      },
      {
        title: "GA4's string dates",
        question: 'Turn 20240614 into a real date.',
        sql: `SELECT event_date,
       PARSE_DATE('%Y%m%d', event_date) AS day,
       FORMAT_DATE('%b %Y', PARSE_DATE('%Y%m%d', event_date)) AS label
FROM ga4_events
GROUP BY event_date, day, label
ORDER BY event_date
LIMIT 5`,
        takeaway:
          'The export really does store dates as strings. It is the partitioning column, and ' +
          'YYYYMMDD sorts correctly as text. So you get pruning for free.',
      },
    ],
    playground: {
      prompt:
        'Build a customer recency segmentation with CASE. Then break it: move the NULL branch to ' +
        'the end and see where the never-ordered customers land.',
      starter: `SELECT CASE
         WHEN last_order_date IS NULL THEN 'never ordered'
         WHEN DATE_DIFF(DATE '2024-12-31', last_order_date, DAY) <= 30 THEN 'active'
         WHEN DATE_DIFF(DATE '2024-12-31', last_order_date, DAY) <= 90 THEN 'lapsing'
         ELSE 'churned' END AS recency_band,
       COUNT(*) AS customers
FROM customer_ltv
GROUP BY recency_band
ORDER BY customers DESC`,
    },
    practice: ['6.1', '6.2', '6.4', '6.5', '6.7', '6.9', '6.10', '6.12', '6.13', '6.17',
      '6.18', '6.20', '6.26', '6.31', '6.32', '6.35'],
    quiz: [
      mcq('d8q1', 'Where does the CASE go to pivot rows into columns?',
        ['Outside the aggregate', 'Inside the aggregate', 'In the WHERE clause', 'In GROUP BY'],
        1,
        '`SUM(CASE WHEN … THEN x ELSE 0 END)`. Outside the aggregate it filters instead of pivoting.'),
      debug('d8q2', 'This report shows April before January. Why?',
        `SELECT FORMAT_DATE('%b %Y', DATE_TRUNC(order_date, MONTH)) AS month, SUM(gross_revenue) AS revenue
FROM orders GROUP BY month ORDER BY month`,
        ['DATE_TRUNC is wrong',
          'It is sorting the formatted string alphabetically',
          'FORMAT_DATE does not support %b',
          'GROUP BY needs the raw date'],
        1,
        'Sort by the underlying date: add it to the GROUP BY and ORDER BY it instead of the label.'),
      mcq('d8q3', 'What does `DATE_DIFF(a, b, DAY)` compute?',
        ['b minus a', 'a minus b. The later date comes first', 'The absolute difference', 'An error if a < b'],
        1,
        'Swap them and you get negative numbers, which is a very quiet way to break a tenure metric.'),
      mcq('d8q4', 'When is `COALESCE(quality_score, 0)` the wrong choice?',
        ['Never',
          'When "unmeasured" and "scored zero" are different statements you need to keep apart',
          'When the column is an integer',
          'When there are no NULLs'],
        1,
        'Defaulting an unknown to zero makes the keyword look terrible rather than unmeasured. Decide, do not default.'),
    ],
    assessment: {
      passScore: 0.7,
      timeLimitSec: 900,
      questions: [
        mcq('d8a1', 'Why must the NULL branch come first in a recency CASE?',
          ['Style convention',
            'Otherwise never-ordered customers fall through into the "churned" bucket',
            'CASE requires it',
            'To avoid an error'],
          1,
          'DATE_DIFF on a NULL is NULL, so every numeric test fails and they land in the ELSE. Reporting them as churned overstates churn.'),
        explain('d8a2', 'What does SAFE_OFFSET protect against?',
          "SPLIT(campaign_name, '_')[SAFE_OFFSET(4)]",
          ['NULL campaign names',
            'Names with fewer than five underscore-separated segments',
            'Non-string columns',
            'Duplicate campaigns'],
          1,
          'OFFSET errors on a short array; SAFE_OFFSET returns NULL. Assume the naming convention will be broken, because it will.'),
        mcq('d8a3', 'What is the difference between CAST(x AS INT64) and ROUND(x)?',
          ['None',
            'CAST truncates towards zero; ROUND rounds to nearest',
            'CAST errors on decimals',
            'ROUND returns a string'],
          1,
          'Casting fractional conversions to integers per row destroys about 8% of them. Round the total, not the rows.'),
      ],
      exerciseIds: ['6.17', '6.32'],
    },
    challenge: '6.40',
    reflection: [
      'What naming convention at your work encodes dimensions you could parse out?',
      'Which of your columns has a NULL that you have been silently defaulting to zero?',
      'Where would a pivot with SUM(CASE …) replace a manual spreadsheet step?',
    ],
    project: {
      title: 'Campaign-name parser',
      brief:
        'Decompose the agency naming convention into real dimensions, then report on dimensions ' +
        'that never existed as columns.',
      tasks: [
        task('parse-cols', 'Parse the convention',
          'Return `campaign_name`, `market`, `channel`, `brandness`, `geo` and `match_type` for every Google campaign, ordered by campaign_name.',
          `SELECT campaign_name,
       SPLIT(campaign_name, '_')[OFFSET(0)] AS market,
       SPLIT(campaign_name, '_')[OFFSET(1)] AS channel,
       SPLIT(campaign_name, '_')[OFFSET(2)] AS brandness,
       SPLIT(campaign_name, '_')[OFFSET(3)] AS geo,
       SPLIT(campaign_name, '_')[SAFE_OFFSET(4)] AS match_type
FROM google_ads_campaigns
ORDER BY campaign_name`,
          ['One SPLIT per segment.',
            'SAFE_OFFSET on the last one, not every name has five parts.'],
          { orderMatters: true }),
        task('parse-report', 'Report by parsed dimension',
          'Per parsed `market` and `brandness`, return `spend`, `clicks`, `ctr`, `conversions` and `cpa`, for markets with over 5,000 spend. Order by spend descending.',
          `SELECT SPLIT(c.campaign_name, '_')[OFFSET(0)] AS market,
       SPLIT(c.campaign_name, '_')[OFFSET(2)] AS brandness,
       SUM(d.cost) AS spend,
       SUM(d.clicks) AS clicks,
       SAFE_DIVIDE(SUM(d.clicks), SUM(d.impressions)) AS ctr,
       SUM(d.conversions) AS conversions,
       SAFE_DIVIDE(SUM(d.cost), SUM(d.conversions)) AS cpa
FROM google_ads_daily d
JOIN google_ads_campaigns c ON c.campaign_id = d.campaign_id
GROUP BY market, brandness
HAVING SUM(d.cost) > 5000
ORDER BY spend DESC, market, brandness`,
          ['The parsed expressions go in both SELECT and GROUP BY.',
            'Brand vs non-brand CPA by market is the most useful slice of a search account.'],
          { orderMatters: true }),
      ],
    },
  },

  // ══════════════════════════════════════════════════════════ DAY 9 ══
  {
    day: 9,
    module: 7,
    moduleTitle: 'CTEs and subqueries',
    title: 'WITH: writing SQL a colleague can read',
    subtitle: 'Multi-step answers that read like a paragraph',
    objective:
      'Break any multi-step question into named steps, and know when NOT IN will silently ' +
      'return nothing.',
    estimatedMinutes: 90,
    concepts: ['cte', 'chained-cte', 'subquery', 'correlated-subquery', 'exists', 'cohort'],
    theory: [
      h('A CTE is a named intermediate result'),
      p(
        '`WITH name AS ( … )` defines a result you can then select from. It does not make the ' +
        'query faster, in BigQuery it is not even materialised. It makes the query readable, ' +
        'which is the reason that actually matters.',
      ),
      key(
        'From today on, every multi-step answer is written as named CTEs that read top to bottom ' +
        'like a paragraph. Nested subqueries still pass grading; they will not pass code review.',
      ),
      h('When a CTE genuinely beats a subquery'),
      p(
        'When you need the same intermediate result twice. Writing it twice is both verbose and ' +
        'a maintenance trap: the day someone edits one copy and not the other, the query starts ' +
        'lying.',
      ),
      sql(
        `WITH per_campaign AS (
  SELECT campaign_id, SUM(cost) AS spend FROM google_ads_daily GROUP BY campaign_id
)
SELECT campaign_id, spend
FROM per_campaign
WHERE spend > (SELECT AVG(spend) FROM per_campaign)
ORDER BY spend DESC`,
        'The same CTE used as both the source and the benchmark.',
      ),
      h('The three kinds of subquery'),
      list([
        '**Scalar**: returns one value, usable anywhere a value is. Evaluated once.',
        '**Table**, sits in FROM. A derived table; an unnamed CTE.',
        '**Predicate**: `IN`, `EXISTS`, `NOT EXISTS` in the WHERE clause.',
      ]),
      call(
        'trap',
        'NOT IN + NULL = no rows, silently',
        '`x NOT IN (1, 2, NULL)` is never TRUE. It is UNKNOWN, because x might equal the ' +
        'unknown value. The query runs, returns zero rows, and looks like a legitimate finding. ' +
        'Use `NOT EXISTS`, which cannot be broken this way.',
      ),
      h('Correlated subqueries'),
      p(
        'A subquery referencing the outer query runs once per outer row. Readable, and slow. At ' +
        '24 campaigns nobody notices; at 24 million rows this is the query that gets you a call ' +
        'from the data team. The LEFT JOIN + GROUP BY version does the same work in one pass.',
      ),
      h('The cohort pattern'),
      p(
        'Three CTEs, every time: **cohort** (each customer\'s first event), **activity** (every ' +
        'event tagged with its offset from that first one), **matrix** (counted per cohort per ' +
        'offset). Name them exactly that and you will be able to debug the middle when the ' +
        'numbers look wrong.',
      ),
    ],
    visual: {
      kind: 'cte-pipeline',
      title: 'A query as a pipeline',
      caption:
        'Four named CTEs feeding each other, with the row count and a sample of rows at each ' +
        'stage. Click a stage to see what it produced.',
    },
    examples: [
      {
        title: 'The cohort matrix',
        question: 'How does retention look by acquisition month?',
        sql: `WITH cohort AS (
  SELECT customer_id, DATE_TRUNC(MIN(order_date), MONTH) AS cohort_month
  FROM orders WHERE status = 'completed' GROUP BY customer_id
), activity AS (
  SELECT c.cohort_month,
         DATE_DIFF(DATE_TRUNC(o.order_date, MONTH), c.cohort_month, MONTH) AS month_number,
         o.customer_id
  FROM orders o JOIN cohort c USING (customer_id)
  WHERE o.status = 'completed'
)
SELECT cohort_month, month_number, COUNT(DISTINCT customer_id) AS customers
FROM activity
GROUP BY cohort_month, month_number
ORDER BY cohort_month, month_number
LIMIT 12`,
        takeaway:
          'Cohort, then activity, then count. Each step does one thing and is nameable in a word.',
      },
      {
        title: 'NOT EXISTS, the safe anti-join',
        question: 'Which customers never bought?',
        sql: `SELECT COUNT(*) AS never_bought
FROM customers c
WHERE NOT EXISTS (
  SELECT 1 FROM orders o
  WHERE o.customer_id = c.customer_id AND o.status = 'completed'
)`,
        takeaway:
          '`SELECT 1` is the convention: EXISTS only cares whether a row comes back, not what ' +
          'is in it. And unlike NOT IN, a NULL cannot silently empty your result.',
      },
      {
        title: 'The funnel, flattened first',
        question: 'How many sessions reach each step?',
        sql: `WITH steps AS (
  SELECT ga_session_id,
         MAX(CASE WHEN event_name = 'session_start' THEN 1 ELSE 0 END) AS s1,
         MAX(CASE WHEN event_name = 'add_to_cart'   THEN 1 ELSE 0 END) AS s2,
         MAX(CASE WHEN event_name = 'purchase'      THEN 1 ELSE 0 END) AS s3
  FROM ga4_events GROUP BY ga_session_id
)
SELECT SUM(s1) AS sessions, SUM(s2) AS carts, SUM(s3) AS purchases FROM steps`,
        takeaway:
          'Flattening to one row per session before counting is what makes this a session funnel ' +
          'rather than an event funnel. A session with three add-to-carts counts once.',
      },
    ],
    playground: {
      prompt:
        'Rewrite yesterday\'s campaign-parser report using CTEs. Then try the NOT IN trap: run ' +
        'the same anti-join with and without an IS NOT NULL guard on the subquery.',
      starter: `WITH spend AS (
  SELECT campaign_id, SUM(cost) AS spend FROM google_ads_daily GROUP BY campaign_id
)
SELECT campaign_id, spend FROM spend ORDER BY spend DESC LIMIT 10`,
    },
    practice: ['7.1', '7.2', '7.3', '7.4', '7.5', '7.7', '7.8', '7.10', '7.11', '7.13', '7.14', '7.17'],
    quiz: [
      mcq('d9q1', 'Does a CTE make a query faster?',
        ['Always', 'No. It makes it readable, and in BigQuery it is not materialised',
          'Only with an index', 'Only for large tables'],
        1,
        'Readability is the reason. The one performance-adjacent benefit is avoiding writing the same subquery twice.'),
      debug('d9q2', 'This anti-join returns zero rows. Why?',
        `SELECT COUNT(*) FROM google_ads_campaigns
WHERE campaign_id NOT IN (SELECT campaign_id FROM orders)`,
        ['The subquery is empty',
          'orders.campaign_id contains NULLs, so NOT IN is never TRUE',
          'The join key is wrong',
          'COUNT(*) needs a GROUP BY'],
        1,
        'Add `WHERE campaign_id IS NOT NULL` to the subquery, or use NOT EXISTS, which cannot break this way.'),
      mcq('d9q3', 'What does `SELECT 1` inside EXISTS mean?',
        ['Return the first row', 'Nothing - EXISTS only checks whether any row comes back',
          'Count the rows', 'Select the first column'],
        1,
        'It is a convention. `SELECT *`, `SELECT NULL` and `SELECT 1` all behave identically inside EXISTS.'),
      order('d9q4', 'Order the CTEs of a cohort analysis.',
        ['cohort, each customer\'s first event',
          'activity, every event tagged with its offset',
          'matrix, counted per cohort per offset',
          'rates, divided by the cohort size'],
        'Each step does one thing. Naming them this way is what lets you debug the middle when the numbers look wrong.'),
    ],
    assessment: {
      passScore: 0.7,
      timeLimitSec: 900,
      questions: [
        mcq('d9a1', 'When does a CTE beat repeating a subquery?',
          ['Always',
            'When the same intermediate result is needed in more than one place',
            'When the query is short',
            'When there is no GROUP BY'],
          1,
          'Two copies of the same subquery is a maintenance trap: someone edits one and the query starts lying.'),
        mcq('d9a2', 'What is the cost of a correlated subquery?',
          ['Nothing', 'It runs once per outer row', 'It cannot use indexes', 'It returns duplicates'],
          1,
          'Fine at 24 rows, fatal at 24 million. The LEFT JOIN + GROUP BY equivalent does it in one pass.'),
        explain('d9a3', 'What does the MAX in this CTE accomplish?',
          `SELECT ga_session_id, MAX(CASE WHEN event_name = 'purchase' THEN 1 ELSE 0 END) AS purchased
FROM ga4_events GROUP BY ga_session_id`,
          ['Finds the largest event',
            'Answers "did this session ever purchase?" as a 0/1 flag',
            'Deduplicates events',
            'Counts purchases'],
          1,
          'MAX over a 0/1 flag is the standard "did it ever happen in this group?" idiom.'),
      ],
      exerciseIds: ['7.6', '7.15'],
    },
    challenge: '7.22',
    reflection: [
      'Take the longest query you have written. How many named steps would it break into?',
      'Have you ever had a NOT IN return nothing and assumed it was a real finding?',
      'What would you name the three CTEs of a retention analysis at your company?',
    ],
    project: {
      title: 'Cohort table builder',
      brief:
        'Build the retention cohort table in named stages, then add the rates. This is the ' +
        'query you will reach for again and again.',
      tasks: [
        task('cohort-matrix', 'The matrix',
          'Return `cohort_month`, `month_number` and `customers` for order cohorts. Chronological, limit 40.',
          `WITH cohort AS (
  SELECT customer_id, DATE_TRUNC(MIN(order_date), MONTH) AS cohort_month
  FROM orders WHERE status = 'completed' GROUP BY customer_id
), activity AS (
  SELECT c.cohort_month,
         DATE_DIFF(DATE_TRUNC(o.order_date, MONTH), c.cohort_month, MONTH) AS month_number,
         o.customer_id
  FROM orders o JOIN cohort c USING (customer_id) WHERE o.status = 'completed'
)
SELECT cohort_month, month_number, COUNT(DISTINCT customer_id) AS customers
FROM activity GROUP BY cohort_month, month_number
ORDER BY cohort_month, month_number LIMIT 40`,
          ['Cohort, then activity, then count.',
            'COUNT DISTINCT because a customer can order twice in a month.'],
          { orderMatters: true }),
        task('cohort-rates', 'Add the retention rate',
          'Extend the matrix with `retention_rate`, customers divided by the cohort\'s month-0 size. Chronological, limit 40.',
          `WITH cohort AS (
  SELECT customer_id, DATE_TRUNC(MIN(order_date), MONTH) AS cohort_month
  FROM orders WHERE status = 'completed' GROUP BY customer_id
), activity AS (
  SELECT c.cohort_month,
         DATE_DIFF(DATE_TRUNC(o.order_date, MONTH), c.cohort_month, MONTH) AS month_number,
         o.customer_id
  FROM orders o JOIN cohort c USING (customer_id) WHERE o.status = 'completed'
), matrix AS (
  SELECT cohort_month, month_number, COUNT(DISTINCT customer_id) AS customers
  FROM activity GROUP BY cohort_month, month_number
), sizes AS (
  SELECT cohort_month, customers AS cohort_size FROM matrix WHERE month_number = 0
)
SELECT m.cohort_month, m.month_number, m.customers,
       SAFE_DIVIDE(m.customers, s.cohort_size) AS retention_rate
FROM matrix m JOIN sizes s USING (cohort_month)
ORDER BY m.cohort_month, m.month_number LIMIT 40`,
          ['The cohort size is the month_number = 0 row of the matrix.',
            'Join the sizes back on to compute the rate.'],
          { orderMatters: true }),
      ],
    },
  },

  // ══════════════════════════════════════════════════════════ DAY 10 ══
  {
    day: 10,
    module: 8,
    moduleTitle: 'Window functions',
    title: 'OVER(): comparing a row to its own group',
    subtitle: 'The tool that replaces an entire class of self-joins',
    objective:
      'Write rankings, period-over-period comparisons and rolling metrics without a single ' +
      'self-join.',
    estimatedMinutes: 100,
    concepts: ['row-number', 'rank', 'lag-lead', 'first-last-value', 'running-total',
      'rolling-window', 'percent-of-total', 'qualify', 'ntile'],
    theory: [
      h('The one difference that matters'),
      p(
        'GROUP BY returns one row per group. A window function returns *every* row, with the ' +
        'group\'s answer attached. That is what lets you compare a row to its own group without ' +
        'collapsing anything.',
      ),
      sql(
        `SELECT campaign_id, date, cost,
       SUM(cost) OVER (PARTITION BY campaign_id) AS campaign_total
FROM google_ads_daily
ORDER BY campaign_id, date
LIMIT 5`,
        'Every row survives, and each carries its campaign total.',
      ),
      h('The three families'),
      list([
        '**Ranking**: ROW_NUMBER, RANK, DENSE_RANK, NTILE. Position within the partition.',
        '**Offset**: LAG, LEAD, FIRST_VALUE, LAST_VALUE. Look at another row.',
        '**Aggregate**. SUM, AVG, COUNT with OVER. The group\'s answer on every row.',
      ]),
      h('Ties'),
      p(
        'ROW_NUMBER never ties. It picks arbitrarily unless you add a tie-break. RANK ties then ' +
        'skips (1, 1, 3). DENSE_RANK ties then continues (1, 1, 2). Use ROW_NUMBER to *pick one*, ' +
        'RANK to *report a placing*.',
      ),
      h('Frames'),
      p(
        'Adding `ORDER BY` inside `OVER` turns an aggregate into a running one, because the ' +
        'default frame becomes "everything up to this row". Specifying `ROWS BETWEEN 6 PRECEDING ' +
        'AND CURRENT ROW` gives you a rolling seven.',
      ),
      call(
        'trap',
        'LAST_VALUE returns the current row',
        'The default frame with ORDER BY ends at CURRENT ROW, so LAST_VALUE sees only rows up to ' +
        'and including the one it is on. Widen it explicitly: `ROWS BETWEEN UNBOUNDED PRECEDING ' +
        'AND UNBOUNDED FOLLOWING`. FIRST_VALUE is unaffected, which is why this catches everyone ' +
        'exactly once.',
      ),
      h('Filtering on a window function'),
      p(
        'You cannot put a window function in WHERE: WHERE runs before SELECT, so it does not ' +
        'exist yet. BigQuery gives you `QUALIFY`; everywhere else you wrap the query in a ' +
        'subquery and filter outside.',
      ),
      key(
        'Top-N-per-group, deduplication, period-over-period and rolling averages are four ' +
        'different questions with one answer: a window function.',
      ),
    ],
    visual: {
      kind: 'window-frame',
      title: 'Scrub the frame',
      caption:
        'Drag a cursor down a table and watch the window frame highlight and the aggregate ' +
        'recompute. Switch frame specs to see running totals become rolling averages.',
    },
    examples: [
      {
        title: 'Top two per category',
        question: 'What are the two most expensive products in each category?',
        sql: `SELECT category, product_name, list_price
FROM products
QUALIFY ROW_NUMBER() OVER (PARTITION BY category ORDER BY list_price DESC, product_id) <= 2
ORDER BY category, list_price DESC`,
        takeaway:
          'The tie-break inside the OVER clause is what makes this reproducible. Without it, ' +
          'tied products swap places between runs.',
      },
      {
        title: 'Month over month',
        question: 'How is revenue trending?',
        sql: `WITH m AS (
  SELECT DATE_TRUNC(order_date, MONTH) AS month, SUM(gross_revenue) AS revenue
  FROM orders WHERE status = 'completed' GROUP BY month
)
SELECT month, revenue,
       LAG(revenue) OVER (ORDER BY month) AS prev_month,
       SAFE_DIVIDE(revenue - LAG(revenue) OVER (ORDER BY month),
                   LAG(revenue) OVER (ORDER BY month)) AS mom_pct
FROM m ORDER BY month`,
        takeaway:
          'Aggregate to month first, or LAG steps one *row* rather than one month. That mistake ' +
          'produces a plausible-looking chart of nonsense.',
      },
      {
        title: 'Rolling seven days',
        question: 'What does spend look like with the weekday cycle removed?',
        sql: `WITH d AS (SELECT date, SUM(spend) AS spend FROM ad_spend_daily GROUP BY date)
SELECT date, spend,
       SUM(spend) OVER (ORDER BY date ROWS BETWEEN 6 PRECEDING AND CURRENT ROW) AS rolling_7d
FROM d WHERE date BETWEEN '2024-10-01' AND '2024-10-10'
ORDER BY date`,
        takeaway:
          'One row per day before the frame, always. A ROWS frame counts rows, and if a day has ' +
          'three campaigns it contributes three rows to your "seven-day" window.',
      },
    ],
    playground: {
      prompt:
        'Write LAST_VALUE with and without the widened frame and compare. Then rewrite ' +
        'yesterday\'s cohort retention using FIRST_VALUE instead of the sizes CTE.',
      starter: `SELECT campaign_id, date, cost,
       LAST_VALUE(cost) OVER (PARTITION BY campaign_id ORDER BY date) AS naive,
       LAST_VALUE(cost) OVER (PARTITION BY campaign_id ORDER BY date
                              ROWS BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING) AS correct
FROM google_ads_daily
ORDER BY campaign_id, date
LIMIT 10`,
    },
    practice: ['8.1', '8.2', '8.3', '8.4', '8.5', '8.6', '8.7', '8.9', '8.11', '8.12',
      '8.14', '8.16', '8.17', '8.19'],
    quiz: [
      mcq('d10q1', 'What is the difference between GROUP BY and a window function?',
        ['None', 'GROUP BY collapses rows; a window function keeps them and attaches the group answer',
          'Window functions are faster', 'GROUP BY cannot use SUM'],
        1,
        'That is precisely what lets you compute "this row versus its group" in one pass.'),
      predict('d10q2', 'Three products tie on price. What does RANK give the next one?',
        'RANK() OVER (ORDER BY list_price DESC)',
        ['2', '4', '3', '1'],
        1,
        'RANK ties then skips: 1, 1, 1, 4. DENSE_RANK would give 2.'),
      debug('d10q3', 'LAST_VALUE returns the same value as the current row. Why?',
        `LAST_VALUE(cost) OVER (PARTITION BY campaign_id ORDER BY date)`,
        ['ORDER BY is wrong',
          'The default frame ends at CURRENT ROW, widen it to UNBOUNDED FOLLOWING',
          'LAST_VALUE needs a PARTITION BY',
          'cost is NULL'],
        1,
        'The default frame with ORDER BY is UNBOUNDED PRECEDING to CURRENT ROW. FIRST_VALUE is unaffected; LAST_VALUE is broken by it.'),
      mcq('d10q4', 'Why aggregate to one row per day before a `ROWS BETWEEN 6 PRECEDING` frame?',
        ['For speed', 'Because the frame counts rows, not days',
          'Because ORDER BY requires it', 'It does not matter'],
        1,
        'With three campaigns per day, a seven-row window covers about two and a third days.'),
    ],
    assessment: {
      passScore: 0.7,
      timeLimitSec: 900,
      questions: [
        mcq('d10a1', 'You need the single best day per campaign. Which function?',
          ['RANK', 'ROW_NUMBER', 'DENSE_RANK', 'NTILE'],
          1,
          'ROW_NUMBER never ties, so it returns exactly one row per partition. RANK could return two on a tie.'),
        mcq('d10a2', 'How do you filter on a window function?',
          ['WHERE', 'HAVING', 'QUALIFY, or a wrapping subquery', 'You cannot'],
          2,
          'WHERE runs before SELECT so the window function does not exist yet. QUALIFY is the BigQuery extension for exactly this.'),
        explain('d10a3', 'What does this compute?',
          `SAFE_DIVIDE(spend, SUM(spend) OVER (PARTITION BY channel_type))`,
          ['The channel total',
            'Each campaign\'s share of its own channel\'s spend',
            'A running total',
            'The average spend'],
          1,
          'The windowed SUM puts the channel total on every row, so the division gives a within-channel share, no self-join needed.'),
      ],
      exerciseIds: ['8.15', '8.22'],
    },
    challenge: '8.26',
    reflection: [
      'Which self-join in your existing SQL could become a window function?',
      'Where would a rolling 7-day metric change how your team reads a chart?',
      'Have you been bitten by the LAST_VALUE frame default before, without knowing why?',
    ],
    project: {
      title: 'Rolling 7-day ROAS with week-over-week delta',
      brief:
        'Build the smoothed performance view: rolling seven-day spend and revenue per channel, ' +
        'and the week-over-week movement in rank.',
      tasks: [
        task('rolling-roas', 'Rolling 7-day ROAS',
          'Return `channel`, `date`, `spend_7d`, `revenue_7d` and `roas_7d` for November 2024. Order by channel then date.',
          `WITH s AS (SELECT channel, date, SUM(spend) AS spend FROM ad_spend_daily GROUP BY channel, date),
r AS (SELECT channel, order_date AS date, SUM(gross_revenue) AS revenue
      FROM orders WHERE status = 'completed' GROUP BY channel, order_date),
j AS (SELECT s.channel, s.date, s.spend, COALESCE(r.revenue, 0) AS revenue
      FROM s LEFT JOIN r ON r.channel = s.channel AND r.date = s.date)
SELECT channel, date,
       SUM(spend) OVER (PARTITION BY channel ORDER BY date ROWS BETWEEN 6 PRECEDING AND CURRENT ROW) AS spend_7d,
       SUM(revenue) OVER (PARTITION BY channel ORDER BY date ROWS BETWEEN 6 PRECEDING AND CURRENT ROW) AS revenue_7d,
       SAFE_DIVIDE(
         SUM(revenue) OVER (PARTITION BY channel ORDER BY date ROWS BETWEEN 6 PRECEDING AND CURRENT ROW),
         SUM(spend) OVER (PARTITION BY channel ORDER BY date ROWS BETWEEN 6 PRECEDING AND CURRENT ROW)) AS roas_7d
FROM j
WHERE date BETWEEN '2024-11-01' AND '2024-11-30'
ORDER BY channel, date`,
          ['One row per channel-date before the frame.',
            'PARTITION BY channel so the window never crosses channels.',
            'Rolling ROAS is rolling revenue over rolling spend, not an average of daily ROAS.'],
          { orderMatters: true }),
        task('rank-movement', 'Rank movement week over week',
          'Return `week_start`, `campaign_id`, `spend`, `rank_this_week` and `rank_last_week`. Order by week then rank, limit 40.',
          `WITH weekly AS (
  SELECT d.week_start, g.campaign_id, SUM(g.cost) AS spend
  FROM google_ads_daily g JOIN date_dim d ON d.date = g.date
  GROUP BY d.week_start, g.campaign_id
), ranked AS (
  SELECT week_start, campaign_id, spend,
         RANK() OVER (PARTITION BY week_start ORDER BY spend DESC) AS rank_this_week
  FROM weekly
)
SELECT week_start, campaign_id, spend, rank_this_week,
       LAG(rank_this_week) OVER (PARTITION BY campaign_id ORDER BY week_start) AS rank_last_week
FROM ranked
ORDER BY week_start, rank_this_week, campaign_id
LIMIT 40`,
          ['Rank within each week first.',
            'Then LAG that rank partitioned by *campaign*, a different partition from the ranking.'],
          { orderMatters: true }),
      ],
    },
  },
];
