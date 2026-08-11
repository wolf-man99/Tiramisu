import type { DayContent } from '../types';
import { p, h, list, key, call, sql, table, compare, mcq, predict, debug, explain, order, task } from './helpers';

export const DAYS_01_05: DayContent[] = [
  // ══════════════════════════════════════════════════════════ DAY 1 ══
  {
    day: 1,
    module: 1,
    moduleTitle: 'How data is actually stored',
    title: 'Grain, keys and why there are so many tables',
    subtitle: 'The mental model everything else hangs off',
    objective:
      'Explain why marketing data lives across many narrow tables, and state the grain of ' +
      'any table you open.',
    estimatedMinutes: 75,
    concepts: ['grain', 'select', 'count', 'distinct'],
    theory: [
      h('The spreadsheet you already know'),
      p(
        'Open any ad platform export and you get one wide sheet: campaign name, date, ' +
        'impressions, clicks, cost, and the campaign name repeated on every single row. ' +
        'That repetition is the problem a database exists to solve.',
      ),
      p(
        'A spreadsheet has exactly one grain, one row per whatever the export happened to be. ' +
        'A warehouse has one grain *per table*, and the whole skill of analysis is keeping track ' +
        'of which one you are standing on.',
      ),
      key(
        'Grain is what one row represents. "One row per order." "One row per campaign per day." ' +
        'Every serious bug in this course is a grain mistake.',
      ),
      h('Facts and dimensions'),
      p(
        'Warehouse tables come in two flavours. **Facts** measure events: they are tall, narrow ' +
        'and append-only: `orders`, `google_ads_daily`, `ga4_events`. **Dimensions** describe ' +
        'things: short, wide and slow-changing: `products`, `customers`, `google_ads_campaigns`.',
      ),
      p(
        'Almost every analytical query joins one to the other: a fact for the numbers, a ' +
        'dimension for the labels. Once you see that pattern you will see it everywhere.',
      ),
      table(
        ['Table', 'Type', 'Grain'],
        [
          ['`google_ads_campaigns`', 'dimension', 'one row per campaign'],
          ['`google_ads_daily`', 'fact', 'one row per date × ad group'],
          ['`orders`', 'fact', 'one row per order (allegedly. Check it)'],
          ['`order_items`', 'fact', 'one row per order × product'],
          ['`ga4_events`', 'fact', 'one row per event'],
          ['`products`', 'dimension', 'one row per product'],
        ],
        'Six tables from the Northbeam warehouse and what one row means in each.',
      ),
      h('Keys'),
      p(
        'A **primary key** uniquely identifies a row. A **foreign key** is a column holding ' +
        'values that exist as keys in another table. That is the whole idea. There is no magic, ' +
        'and in BigQuery there is no enforcement either.',
      ),
      call(
        'trap',
        'Never assume a column named *_id is unique',
        'BigQuery does not enforce primary keys. In this warehouse `orders.order_id` repeats, ' +
        'a webhook replayed and duplicated 26 orders. Every revenue figure computed without ' +
        'deduplicating is overstated. Check with COUNT(*) vs COUNT(DISTINCT id) before you trust it.',
      ),
      h('Normalisation, in one paragraph'),
      p(
        'Splitting repeated data into its own table is called normalisation. It exists so that ' +
        'renaming a campaign is one edit instead of fourteen thousand, and so that a campaign ' +
        'with no spend yet still exists somewhere. The cost is that you have to join things back ' +
        'together, which is what days 6 and 7 are about.',
      ),
      call(
        'engine',
        'BigQuery denormalises on purpose',
        'BigQuery has no indexes and joins are expensive at scale, so it lets you nest related ' +
        'data *inside* a row using STRUCT and ARRAY. The GA4 export does exactly that. You will ' +
        'meet it properly on days 11 and 12.',
      ),
    ],
    visual: {
      kind: 'normalization',
      title: 'From flat export to normalised warehouse',
      caption:
        'Watch a 40-column ad export split into campaigns, ad groups and daily metrics, and ' +
        'watch every redundant cell disappear as it does.',
    },
    examples: [
      {
        title: 'Counting rows vs counting things',
        question: 'How many campaigns are there, and how many campaign-days?',
        sql: `SELECT
  (SELECT COUNT(*) FROM google_ads_campaigns) AS campaigns,
  (SELECT COUNT(*) FROM google_ads_daily) AS campaign_day_rows`,
        takeaway:
          'Both are COUNT(*), and they mean completely different things, because the two tables ' +
          'have different grains. The function did not change; the table did.',
      },
      {
        title: 'Proving a grain',
        question: 'Does `google_ads_daily` really have one row per date per ad group?',
        sql: `SELECT COUNT(*) AS row_count,
       COUNT(DISTINCT date || '|' || ad_group_id) AS distinct_combinations
FROM google_ads_daily`,
        takeaway:
          'The two numbers match, so the grain is confirmed. The separator in the concatenation ' +
          'is not decoration: without it, ("2024-01-1","23") and ("2024-01-12","3") would collide.',
      },
      {
        title: 'The grain ladder',
        question: 'How do customers, orders and line items relate in volume?',
        sql: `SELECT
  (SELECT COUNT(*) FROM customers)   AS customers,
  (SELECT COUNT(*) FROM orders)      AS orders,
  (SELECT COUNT(*) FROM order_items) AS line_items`,
        takeaway:
          'Each step down is a finer grain, and each multiplies rows. On day 7 you will inflate ' +
          'revenue by 2.19× by summing at the wrong rung of this ladder.',
      },
    ],
    playground: {
      prompt:
        'Open any table and work out its grain. Try `products`, `subscriptions`, ' +
        '`attribution_touchpoints`. For each one, ask: what does one row represent, and which ' +
        'column (or columns) would be unique?',
      starter: `-- What is the grain of this table? Prove it.
SELECT COUNT(*) AS rows_total,
       COUNT(DISTINCT customer_id) AS distinct_customers
FROM subscriptions`,
    },
    practice: ['1.1', '1.2', '1.3', '1.4', '1.5', '1.6'],
    quiz: [
      mcq('d1q1', 'What does "grain" mean?',
        ['The number of rows in a table',
          'What one row of the table represents',
          'The primary key column',
          'How the table is sorted'],
        1,
        'Grain is the meaning of a row. "One row per order" and "one row per order line" are two different grains of the same business object, and mixing them up inflates every sum.'),
      mcq('d1q2', 'Why can `orders.order_id` not be trusted as a primary key here?',
        ['Because it is an integer',
          'Because BigQuery does not enforce keys, and 26 rows are duplicated',
          'Because it is nullable',
          'Because it is also a foreign key'],
        1,
        'BigQuery enforces nothing. A webhook replay duplicated 26 orders, so COUNT(*) exceeds COUNT(DISTINCT order_id), and every naive SUM is overstated.'),
      predict('d1q3', 'What will this return?',
        `SELECT COUNT(*) AS a, COUNT(DISTINCT campaign_id) AS b FROM google_ads_daily`,
        ['a and b are equal',
          'a is much larger than b',
          'b is larger than a',
          'It errors. You cannot mix COUNT(*) and COUNT(DISTINCT)'],
        1,
        'The table has one row per date per ad group, so each campaign appears on hundreds of rows. a counts rows; b counts campaigns.'),
      mcq('d1q4', 'Which of these is a dimension table?',
        ['`ga4_events`', '`orders`', '`products`', '`google_ads_keyword_daily`'],
        2,
        'Dimensions describe things and are short, wide and slow-changing. The other three measure events and grow forever.'),
    ],
    assessment: {
      passScore: 0.7,
      timeLimitSec: 600,
      questions: [
        mcq('d1a1', 'A table has 6,610 rows and 6,584 distinct order_ids. What do you conclude?',
          ['The table is fine. Ids can repeat',
            '26 orders are duplicated and any SUM over this table is overstated',
            'There are 26 orders missing',
            'order_id is a foreign key'],
          1,
          'The gap is duplication. Until it is handled, every aggregate over the table is inflated by those rows.'),
        order('d1a2', 'Put these tables in order from coarsest grain to finest.',
          ['customers', 'orders', 'order_items'],
          'One customer has many orders; one order has many line items. Each step is finer, and each multiplies rows when you join.'),
        mcq('d1a3', 'Why does normalisation exist?',
          ['To make queries faster',
            'To avoid repeating the same value on thousands of rows, so one edit changes one place',
            'Because BigQuery requires it',
            'To reduce the number of tables'],
          1,
          'It is about consistency and single-source-of-truth, not speed. BigQuery actively encourages denormalising for performance.'),
      ],
      exerciseIds: ['1.7', '1.8'],
    },
    challenge: '1.8',
    reflection: [
      'Pick a table you use at work. What is its grain, in one sentence?',
      'Name a report you have seen that probably summed a column at the wrong grain. What would the symptom have looked like?',
      'Which of the Northbeam tables surprised you most when you checked its grain?',
    ],
    project: {
      title: 'Warehouse audit',
      brief:
        'You have joined Northbeam and been handed the warehouse. Before you answer a single ' +
        'business question, audit what you have been given: row counts, key uniqueness, and ' +
        'where the data quality problems are.',
      tasks: [
        task('audit-counts', 'Row counts across the warehouse',
          'Return `customers`, `orders`, `order_items`, `sessions` and `events`. One row of counts.',
          `SELECT
  (SELECT COUNT(*) FROM customers)     AS customers,
  (SELECT COUNT(*) FROM orders)        AS orders,
  (SELECT COUNT(*) FROM order_items)   AS order_items,
  (SELECT COUNT(*) FROM ga4_sessions)  AS sessions,
  (SELECT COUNT(*) FROM ga4_events)    AS events`,
          ['Five scalar subqueries in one SELECT.',
            'Each is independent, no FROM clause on the outer query.']),
        task('audit-keys', 'Key uniqueness check',
          'Return `order_rows`, `distinct_orders`, `customer_rows` and `distinct_customers` so you can see which keys are trustworthy.',
          `SELECT
  (SELECT COUNT(*) FROM orders)                       AS order_rows,
  (SELECT COUNT(DISTINCT order_id) FROM orders)       AS distinct_orders,
  (SELECT COUNT(*) FROM customers)                    AS customer_rows,
  (SELECT COUNT(DISTINCT customer_id) FROM customers) AS distinct_customers`,
          ['Compare COUNT(*) to COUNT(DISTINCT key) for each table.',
            'One of these two pairs will not match.']),
      ],
    },
  },

  // ══════════════════════════════════════════════════════════ DAY 2 ══
  {
    day: 2,
    module: 2,
    moduleTitle: 'Reading data',
    title: 'SELECT, aliases, ORDER BY and the cost of *',
    subtitle: 'Your first real queries, all of them useful',
    objective:
      'Write a query that returns exactly the columns you want, sorted the way you want, and ' +
      'explain why `SELECT *` costs money.',
    estimatedMinutes: 80,
    concepts: ['select', 'alias', 'limit', 'distinct', 'order-by'],
    theory: [
      h('The skeleton'),
      p('Every query you will ever write has the same bones:'),
      sql('SELECT <what you want>\nFROM <where it lives>', 'The two-line query. Everything else is optional.', false),
      p(
        'That is genuinely it. `WHERE`, `GROUP BY`, `JOIN` and the rest are refinements on those ' +
        'two lines, and you will add them one at a time over the next six days.',
      ),
      h('Projection: choosing columns'),
      p(
        'Listing columns after SELECT is called projection. You can also compute new ones, ' +
        'arithmetic, string operations, conditionals: and they exist only in the output, ' +
        'stored nowhere.',
      ),
      sql(
        `SELECT product_name,
       list_price,
       unit_cost,
       list_price - unit_cost AS unit_margin
FROM products`,
        'A derived column. `unit_margin` does not exist in the table.',
      ),
      call(
        'money',
        'SELECT * is the expensive habit',
        'BigQuery is columnar: it reads only the columns you name, and bills you for the bytes ' +
        'it reads. Naming three columns out of thirteen costs roughly a quarter as much. ' +
        '`SELECT * … LIMIT 10` scans the entire table and charges you for all of it, because the ' +
        'limit is applied after the read.',
      ),
      h('Aliases'),
      p(
        '`AS` renames a column in the output. Aliases with spaces or punctuation need double ' +
        'quotes. Crucially, an alias exists only in the output: `WHERE` cannot see it, because ' +
        'WHERE runs before SELECT. `ORDER BY` can, because it runs after.',
      ),
      h('ORDER BY and LIMIT'),
      p(
        'Sorting takes a list of columns, each with its own direction. `LIMIT` slices *after* ' +
        'the sort: the database orders everything, then hands you the top n.',
      ),
      call(
        'trap',
        'Always add a tie-break',
        'If two rows tie on your sort column, their relative order is undefined and can change ' +
        'between runs. `ORDER BY cost DESC` on a table with ties gives a "top 10" that is not ' +
        'reproducible. `ORDER BY cost DESC, campaign_id` fixes it, costs nothing, and saves you ' +
        'from a very confusing bug report.',
      ),
      h('DISTINCT'),
      p(
        '`SELECT DISTINCT` removes duplicate rows across the *whole* select list. ' +
        '`SELECT DISTINCT a, b` gives distinct pairs, not distinct a alongside distinct b. ' +
        'Running it on a column before you filter on it is the cheapest way to avoid an hour ' +
        'lost to `WHERE channel_type = \'Search\'` returning nothing because the data says `SEARCH`.',
      ),
    ],
    visual: {
      kind: 'select-projection',
      title: 'What the database actually reads',
      caption:
        'A columnar table with the selected columns highlighted. Toggle between `SELECT *` and ' +
        'three named columns and watch the bytes-read counter move.',
    },
    examples: [
      {
        title: 'A campaign catalogue for Monday standup',
        question: 'What is running right now, and on what budget?',
        sql: `SELECT campaign_name AS "Campaign",
       channel_type AS "Channel",
       country AS "Market",
       daily_budget AS "Daily budget"
FROM google_ads_campaigns
WHERE status = 'ENABLED'
ORDER BY daily_budget DESC, campaign_name
LIMIT 10`,
        takeaway:
          'Aliases turn a query result into something you can paste into Slack without ' +
          'explaining what `daily_budget` means.',
      },
      {
        title: 'What values actually exist',
        question: 'What channel types are in the account?',
        sql: 'SELECT DISTINCT channel_type FROM google_ads_campaigns ORDER BY channel_type',
        takeaway:
          'Run this before you write any filter. It takes two seconds and saves you from ' +
          'case-mismatch bugs that produce zero rows and no error.',
      },
      {
        title: 'Computing a rate safely',
        question: 'What is the CTR of each campaign-day?',
        sql: `SELECT date, impressions, clicks,
       SAFE_DIVIDE(clicks, impressions) AS ctr
FROM google_ads_daily
ORDER BY date, ad_group_id
LIMIT 10`,
        takeaway:
          '154 rows in this table have zero impressions. `clicks / impressions` would break on ' +
          'them; `SAFE_DIVIDE` returns NULL instead. Get into the habit now.',
      },
    ],
    playground: {
      prompt:
        'Build the campaign inventory you would actually send. Add columns, rename them, sort ' +
        'by something useful, and try removing the tie-break from ORDER BY to see whether the ' +
        'result changes between runs.',
      starter: `SELECT campaign_name, channel_type, country, daily_budget
FROM google_ads_campaigns
ORDER BY daily_budget DESC, campaign_name
LIMIT 15`,
    },
    practice: ['2.1', '2.2', '2.3', '2.4', '2.5', '2.6', '2.7', '2.8', '2.9', '2.10', '2.11', '2.12'],
    quiz: [
      mcq('d2q1', 'Why does `SELECT * FROM ga4_events LIMIT 10` cost as much as reading the whole table?',
        ['It does not - LIMIT reduces the scan',
          'Because BigQuery bills bytes scanned, and the scan happens before the limit',
          'Because ga4_events has no index',
          'Because LIMIT is applied on the client'],
        1,
        'LIMIT slices the result after the read. The only ways to reduce bytes scanned are naming fewer columns and pruning partitions.'),
      debug('d2q2', 'This query errors. Why?',
        `SELECT campaign_name, daily_budget * 30 AS monthly_budget
FROM google_ads_campaigns
WHERE monthly_budget > 5000`,
        ['`daily_budget` does not exist',
          'WHERE runs before SELECT, so the alias `monthly_budget` is not available yet',
          'You cannot multiply in a SELECT list',
          'The alias needs double quotes'],
        1,
        'Logical query order is FROM → WHERE → GROUP BY → HAVING → SELECT → ORDER BY. Repeat the expression in WHERE, or wrap the query in a subquery.'),
      predict('d2q3', 'How many rows does this return, given 5 categories and 3 devices?',
        `SELECT DISTINCT category FROM products`,
        ['5', '3', '15', '24'],
        0,
        'DISTINCT collapses the 24 product rows into one per distinct category. There are 5.'),
      mcq('d2q4', 'What does `SELECT DISTINCT campaign_id, campaign_name` return?',
        ['Distinct campaign_ids, with any name',
          'Distinct pairs of (campaign_id, campaign_name)',
          'An error',
          'Distinct campaign_ids and separately distinct names'],
        1,
        'DISTINCT applies to the whole select list. If a campaign was ever renamed, its id appears twice, which is exercise 2.14.'),
    ],
    assessment: {
      passScore: 0.7,
      timeLimitSec: 720,
      questions: [
        mcq('d2a1', 'Which clause can use a SELECT alias?',
          ['WHERE', 'GROUP BY', 'ORDER BY', 'None of them'],
          2,
          'ORDER BY runs after SELECT, so the alias exists by then. WHERE and GROUP BY run before it.'),
        debug('d2a2', 'This "top 5" report gives different results on different runs. Why?',
          `SELECT campaign_name, daily_budget FROM google_ads_campaigns
ORDER BY daily_budget DESC LIMIT 5`,
          ['LIMIT is non-deterministic',
            'Several campaigns share a budget, and ties have no defined order',
            'ORDER BY DESC is unstable',
            'The table changes between runs'],
          1,
          'Add a tie-break: `ORDER BY daily_budget DESC, campaign_name`. It costs nothing and makes the result reproducible.'),
        mcq('d2a3', 'You need CTR but some rows have zero impressions. What do you write?',
          ['clicks / impressions',
            'SAFE_DIVIDE(clicks, impressions)',
            'ROUND(clicks / impressions, 2)',
            'AVG(clicks / impressions)'],
          1,
          'SAFE_DIVIDE returns NULL rather than erroring on a zero denominator. Option 4 is also the wrong metric, never average a rate.'),
      ],
      exerciseIds: ['2.13', '2.15'],
    },
    challenge: '2.20',
    reflection: [
      'Which columns do you habitually `SELECT *` for? What would you name instead?',
      'Describe a time a sort order surprised you. Was it a tie-break problem?',
      'What is one filter you have written that returned zero rows because of a case mismatch?',
    ],
    project: {
      title: 'Campaign inventory',
      brief:
        'Build the one-query catalogue of everything running that you would send to the team ' +
        'on a Monday morning: readable names, useful sorting, and a brand flag in words.',
      tasks: [
        task('inv-catalogue', 'The catalogue',
          'Return `campaign_name`, `channel_type`, `country`, `status`, `daily_budget` and a `brand_flag` column showing `Brand` or `Non-brand`. Sort by status, then budget descending.',
          `SELECT campaign_name, channel_type, country, status, daily_budget,
       CASE WHEN is_brand = 1 THEN 'Brand' ELSE 'Non-brand' END AS brand_flag
FROM google_ads_campaigns
ORDER BY status, daily_budget DESC, campaign_name`,
          ['CASE turns a 1/0 code into a word.',
            'Two sort keys with different directions, plus a tie-break.'],
          { orderMatters: true }),
        task('inv-formats', 'Meta creative inventory',
          'Return every distinct `creative_format` and `adset_name` combination on Meta, sorted by both.',
          `SELECT DISTINCT creative_format, adset_name
FROM meta_ads_daily
ORDER BY creative_format, adset_name`,
          ['DISTINCT over two columns gives distinct pairs.',
            'Sort by both to make it readable.'],
          { orderMatters: true }),
      ],
    },
  },

  // ══════════════════════════════════════════════════════════ DAY 3 ══
  {
    day: 3,
    module: 3,
    moduleTitle: 'Filtering',
    title: 'WHERE, and the three-valued logic nobody warns you about',
    subtitle: 'The day NULL starts costing you rows',
    objective:
      'Write filters that keep exactly the rows you meant, including the ones where the value ' +
      'is missing.',
    estimatedMinutes: 95,
    concepts: ['where', 'boolean-logic', 'like', 'in', 'between', 'null-handling'],
    theory: [
      h('WHERE runs first'),
      p(
        '`WHERE` filters rows before anything else happens: before grouping, before SELECT. ' +
        'That is why it cannot see aggregates or aliases, and why it is the cheapest place to ' +
        'cut data.',
      ),
      h('Combining conditions'),
      p(
        '`AND` needs both sides true, `OR` needs one. The trap is precedence: **AND binds ' +
        'tighter than OR**, so `a AND b OR c` means `(a AND b) OR c`.',
      ),
      compare(
        'What you wrote',
        "WHERE channel_type = 'SEARCH'\n  AND country = 'US'\n   OR country = 'GB'",
        'What it means',
        "WHERE (channel_type = 'SEARCH'\n       AND country = 'US')\n   OR country = 'GB'",
        'Every UK campaign of every channel type comes back. When AND and OR appear together, bracket. Even when you are sure.',
      ),
      h('Shorthands'),
      list([
        '`col IN (a, b, c)`: the same plan as a chain of ORs, but harder to bracket wrongly.',
        '`col BETWEEN a AND b`, **inclusive on both ends**. `BETWEEN \'2024-03-01\' AND \'2024-04-01\'` includes a day of April.',
        '`col LIKE \'pattern\'`: `%` matches any run of characters, `_` matches exactly one.',
      ]),
      call(
        'trap',
        'The underscore in LIKE is a wildcard',
        '`LIKE \'GB_%\'` does not mean "starts with GB underscore". It means "starts with GB, ' +
        'then any character, then anything". A literal underscore needs escaping: ' +
        "`LIKE 'GB\\_%' ESCAPE '\\'`.",
      ),
      h('NULL is not a value'),
      p(
        'NULL is the *absence* of a value. It is not zero, not empty string, and not equal to ' +
        'anything, including itself. Every comparison involving NULL evaluates to UNKNOWN, and ' +
        '`WHERE` keeps only rows that are TRUE.',
      ),
      table(
        ['Expression', 'Result'],
        [
          ['`NULL = NULL`', 'UNKNOWN'],
          ['`NULL != 5`', 'UNKNOWN'],
          ['`NULL IS NULL`', 'TRUE'],
          ['`TRUE AND UNKNOWN`', 'UNKNOWN'],
          ['`TRUE OR UNKNOWN`', 'TRUE'],
        ],
        'Three-valued logic. Only the third row can be seen by a WHERE clause.',
      ),
      key(
        'A `!=` filter silently excludes every row where the column is NULL. If you want them, ' +
        'you must say `OR col IS NULL` out loud.',
      ),
      call(
        'money',
        '3,380 orders',
        'In this warehouse, `WHERE campaign_id != 1001` returns 2,914 orders. ' +
        '`WHERE campaign_id != 1001 OR campaign_id IS NULL` returns 6,294. The 3,380-order gap ' +
        'is every organic and direct purchase, which by definition has no campaign. Report the ' +
        'first number and you have understated non-paid revenue by a fifth.',
      ),
      h('Filter hygiene'),
      p(
        'Before any analysis, ask what should not be in the data: internal QA traffic, test ' +
        'orders, the conversion-lag window at the end of your date range. Each is a filter you ' +
        'should be able to defend out loud, because someone will ask.',
      ),
    ],
    visual: {
      kind: 'truth-table',
      title: 'Three-valued logic, live',
      caption:
        'Toggle A, B and NULL and watch AND, OR and NOT resolve, with the live row count from ' +
        '`orders` updating underneath so you can see what each choice costs you.',
    },
    examples: [
      {
        title: 'Wasted spend, filtered properly',
        question: 'Which campaign-days cost money and produced nothing?',
        sql: `SELECT date, campaign_id, cost, impressions
FROM google_ads_daily
WHERE cost > 30
  AND conversions = 0
  AND date <= '2024-12-29'
  AND impressions > 0
ORDER BY cost DESC, date
LIMIT 10`,
        takeaway:
          'Every clause answers an objection before it is raised. The date filter pre-empts ' +
          '"those conversions have not landed yet"; the impressions filter pre-empts "that ' +
          'campaign was not even serving".',
      },
      {
        title: 'Finding the missing values',
        question: 'Which keywords have no Quality Score?',
        sql: `SELECT keyword_text, match_type, quality_score
FROM google_ads_keywords
WHERE quality_score IS NULL
ORDER BY keyword_id
LIMIT 10`,
        takeaway:
          '`WHERE quality_score = NULL` would return zero rows, silently. Only IS NULL can see a NULL.',
      },
      {
        title: 'Cleaning as you filter',
        question: 'How many distinct spellings of London are in the orders table?',
        sql: `SELECT DISTINCT city
FROM orders
WHERE LOWER(TRIM(city)) = 'london'
ORDER BY city`,
        takeaway:
          'Four stored values are one city. Any `GROUP BY city` report splits them into four ' +
          'rows, each looking like a smaller market than it is.',
      },
    ],
    playground: {
      prompt:
        'Take the wasted-spend query and break it deliberately. Remove the impressions filter. ' +
        'Change `!=` to `IS NOT`. Swap AND for OR without brackets. Watch the row count each ' +
        'time and predict it before you run.',
      starter: `SELECT COUNT(*) AS rows_returned
FROM orders
WHERE campaign_id != 1001`,
    },
    practice: ['3.1', '3.2', '3.3', '3.4', '3.5', '3.6', '3.7', '3.8', '3.9', '3.10',
      '3.11', '3.12', '3.13', '3.16', '3.17', '3.19'],
    quiz: [
      mcq('d3q1', 'What does `WHERE quality_score = NULL` return?',
        ['Rows where the score is missing', 'Zero rows, always', 'An error', 'All rows'],
        1,
        '`= NULL` evaluates to UNKNOWN for every row, and WHERE keeps only TRUE. The operator you need is IS NULL.'),
      predict('d3q2', 'Given AND binds tighter than OR, what does this return?',
        `SELECT COUNT(*) FROM google_ads_campaigns
WHERE channel_type = 'SEARCH' AND country = 'US' OR country = 'GB'`,
        ['US search campaigns only',
          'US search campaigns, plus every UK campaign of any type',
          'Campaigns in both US and GB',
          'An error'],
        1,
        'It parses as `(SEARCH AND US) OR GB`. Bracket the OR to get what you meant.'),
      mcq('d3q3', 'Is `BETWEEN \'2024-03-01\' AND \'2024-03-31\'` inclusive of 31 March?',
        ['No', 'Yes, both endpoints are included', 'Only the lower bound', 'It depends on the column type'],
        1,
        'BETWEEN is inclusive on both ends. That is why `AND \'2024-04-01\'` quietly adds a day of April.'),
      debug('d3q4', 'This report is missing a third of the orders. What is wrong?',
        `SELECT COUNT(*) FROM orders WHERE campaign_id != 1001`,
        ['The comparison should be `<>`',
          'It excludes every row where campaign_id IS NULL',
          'It needs a GROUP BY',
          'campaign_id is a string'],
        1,
        'NULL != 1001 is UNKNOWN, not TRUE, so all 3,380 unattributed orders are dropped. Add `OR campaign_id IS NULL`.'),
    ],
    assessment: {
      passScore: 0.7,
      timeLimitSec: 900,
      questions: [
        mcq('d3a1', 'You want every campaign except the paused ones, including any with a NULL status. What do you write?',
          ["WHERE status != 'PAUSED'",
            "WHERE status != 'PAUSED' OR status IS NULL",
            "WHERE NOT status = 'PAUSED'",
            "WHERE status <> 'PAUSED'"],
          1,
          'Options 1, 3 and 4 are all equivalent and all drop the NULLs. Only option 2 keeps them.'),
        mcq('d3a2', 'Why filter out `source = \'internal-qa\'` before analysing sessions?',
          ['It is a large share of traffic',
            'QA traffic lands disproportionately on high-intent pages and distorts conversion rates',
            'The rows are duplicated',
            'It has NULL revenue'],
          1,
          'It is only 130 sessions, but QA tests the checkout flow, so it concentrates exactly where it does most damage to a CVR.'),
        explain('d3a3', 'What does this filter actually keep?',
          "WHERE campaign_name LIKE 'GB_%'",
          ['Campaigns whose name starts with the three characters G, B, underscore',
            'Campaigns whose name starts with GB followed by any character',
            'Campaigns containing GB anywhere',
            'Campaigns named exactly GB'],
          1,
          '`_` is a single-character wildcard. To match a literal underscore you must escape it.'),
      ],
      exerciseIds: ['3.22', '3.27'],
    },
    challenge: '3.30',
    reflection: [
      'Write down one filter from a report you own. Does it handle NULLs the way you intended?',
      'What is your conversion-lag window at work, and does your reporting exclude it?',
      'Which columns in your own data are dirty enough to need TRIM or LOWER before grouping?',
    ],
    project: {
      title: 'Wasted-spend finder',
      brief:
        'Find the money Northbeam burned in 2024, campaign-days with real spend and nothing to ' +
        'show for it, with every filter defensible out loud.',
      tasks: [
        task('waste-list', 'The offender list',
          'Return `date`, `campaign_id`, `cost`, `impressions` and `clicks` for campaign-days with cost above 30, zero conversions, impressions above zero, on or before 2024-12-29. Highest cost first, top 25.',
          `SELECT date, campaign_id, cost, impressions, clicks
FROM google_ads_daily
WHERE cost > 30 AND conversions = 0 AND impressions > 0 AND date <= '2024-12-29'
ORDER BY cost DESC, date, campaign_id
LIMIT 25`,
          ['Four AND conditions.',
            'Each one should be defensible to a sceptical stakeholder.'],
          { orderMatters: true }),
        task('waste-total', 'The headline number',
          'Return `wasted_spend` and `wasted_days`, the total across all those campaign-days.',
          `SELECT SUM(cost) AS wasted_spend, COUNT(*) AS wasted_days
FROM google_ads_daily
WHERE cost > 30 AND conversions = 0 AND impressions > 0 AND date <= '2024-12-29'`,
          ['Same filters, aggregated instead of listed.',
            'The total is what gets the meeting; the list is what gets the fix.']),
      ],
    },
  },

  // ══════════════════════════════════════════════════════════ DAY 4 ══
  {
    day: 4,
    module: 4,
    moduleTitle: 'Aggregation',
    title: 'COUNT, SUM, AVG - and never averaging a rate',
    subtitle: 'The single most valuable idea in the course',
    objective:
      'Compute correct rate metrics, and explain why the naive version can be seven times wrong.',
    estimatedMinutes: 90,
    concepts: ['count', 'sum', 'avg', 'min-max', 'countif', 'rate-metrics', 'group-by'],
    theory: [
      h('Aggregates collapse rows'),
      p(
        'An aggregate function takes many rows and returns one value. Without a GROUP BY it ' +
        'collapses the whole table into a single row; with one, it returns a row per group.',
      ),
      h('Three counts, three answers'),
      p(
        '`COUNT(*)` counts rows. `COUNT(col)` counts rows where col is not NULL. ' +
        '`COUNT(DISTINCT col)` counts unique non-NULL values. They are different numbers and ' +
        'people confuse them constantly.',
      ),
      sql(
        `SELECT COUNT(*) AS all_events,
       COUNT(user_id) AS rows_with_user,
       COUNT(DISTINCT user_id) AS distinct_users
FROM ga4_events`,
        'Three very different numbers from one table. user_id is NULL until someone logs in.',
      ),
      call(
        'trap',
        'COUNT(column) looks like COUNT(*) and is not',
        'It silently skips NULLs. If you write "users" in a report, be able to say which of the ' +
        'three you meant, and check whether the column you counted has NULLs in it.',
      ),
      h('The rule that matters most'),
      key('A rate is a ratio of sums, never a mean of ratios.'),
      p(
        'Averaging per-row CTR gives a campaign-day with 12 impressions exactly as much weight ' +
        'as one with 40,000. In this warehouse that produces 6.6% instead of the true 0.96%, a ' +
        'factor of seven, from the same data, with no error message.',
      ),
      compare(
        'Wrong',
        'SELECT AVG(clicks / impressions) AS ctr\nFROM google_ads_daily',
        'Right',
        'SELECT SAFE_DIVIDE(SUM(clicks), SUM(impressions)) AS ctr\nFROM google_ads_daily',
        'The right-hand version weights each row by its own volume, which is what "the CTR of this account" means. Every rate metric works this way: CTR, CVR, margin, open rate, all of them.',
      ),
      h('AVG and NULLs'),
      p(
        '`AVG` skips NULLs, which shrinks the denominator without telling you. Sometimes that is ' +
        'right. An unsurveyed support ticket should not count as a zero CSAT. Sometimes it is ' +
        'catastrophic. A missing discount really does mean zero. Decide, do not default.',
      ),
      h('GROUP BY'),
      p(
        'Grouping splits the table into buckets and runs the aggregates within each. Every ' +
        'non-aggregated column in SELECT must appear in GROUP BY, because otherwise the database ' +
        'would not know which of the bucketed values to show you.',
      ),
      call(
        'info',
        'COUNTIF is your friend',
        '`COUNTIF(condition)` counts rows matching a condition, BigQuery shorthand for ' +
        '`COUNT(CASE WHEN cond THEN 1 END)`. It returns 0 rather than NULL on empty input, ' +
        'which `SUM(CASE …)` would not.',
      ),
    ],
    visual: {
      kind: 'grain',
      title: 'Weighted vs unweighted, side by side',
      caption:
        'Two campaign-days, one with 12 impressions, one with 40,000, and the two CTR ' +
        'calculations racing each other. Drag the volume slider and watch them diverge.',
    },
    examples: [
      {
        title: 'The channel scorecard',
        question: 'How is each channel type performing?',
        sql: `SELECT c.channel_type,
       SUM(d.cost) AS spend,
       SUM(d.clicks) AS clicks,
       SAFE_DIVIDE(SUM(d.clicks), SUM(d.impressions)) AS ctr,
       SAFE_DIVIDE(SUM(d.cost), SUM(d.clicks)) AS cpc,
       SAFE_DIVIDE(SUM(d.cost), SUM(d.conversions)) AS cpa
FROM google_ads_daily d
JOIN google_ads_campaigns c ON c.campaign_id = d.campaign_id
GROUP BY c.channel_type
ORDER BY spend DESC`,
        takeaway:
          'Dimension, then volumes, then rates derived from those volumes. This shape is the ' +
          'backbone of nearly every paid-media report you will write.',
      },
      {
        title: 'The gap, measured',
        question: 'How wrong is the naive CTR?',
        sql: `SELECT SAFE_DIVIDE(SUM(clicks), SUM(impressions)) AS weighted_ctr,
       AVG(SAFE_DIVIDE(clicks, impressions)) AS average_of_ctrs
FROM google_ads_daily`,
        takeaway:
          '0.96% versus 6.6%. Both are one line of SQL. Only one of them is the CTR of this account.',
      },
      {
        title: 'Conditional counts',
        question: 'How many campaign-days had delivery problems?',
        sql: `SELECT COUNT(*) AS total_days,
       COUNTIF(clicks = 0) AS zero_click_days,
       COUNTIF(impressions = 0) AS zero_impression_days
FROM google_ads_daily`,
        takeaway:
          'Two different failure modes with two different fixes: zero clicks is a creative or ' +
          'relevance problem; zero impressions is a budget, bid or approval problem.',
      },
    ],
    playground: {
      prompt:
        'Compute CTR both ways for a single campaign, then for the whole account. The gap grows ' +
        'as the volume distribution gets more uneven. Try to find the campaign where the two ' +
        'numbers disagree most.',
      starter: `SELECT campaign_id,
       SAFE_DIVIDE(SUM(clicks), SUM(impressions)) AS weighted_ctr,
       AVG(SAFE_DIVIDE(clicks, impressions)) AS mean_daily_ctr
FROM google_ads_daily
GROUP BY campaign_id
ORDER BY campaign_id
LIMIT 10`,
    },
    practice: ['4.1', '4.2', '4.3', '4.4', '4.5', '4.6', '4.7', '4.8', '4.10', '4.11',
      '4.12', '4.13', '4.14', '4.19'],
    quiz: [
      mcq('d4q1', 'Why is `AVG(clicks / impressions)` the wrong way to compute CTR?',
        ['It errors on zero impressions',
          'It weights every row equally regardless of volume',
          'AVG cannot take an expression',
          'It rounds incorrectly'],
        1,
        'A day with 12 impressions counts as much as one with 40,000. The correct form is SUM(clicks) / SUM(impressions).'),
      predict('d4q2', 'ga4_events has 54,042 rows and 22,835 of them have a user_id. What does `COUNT(user_id)` return?',
        'SELECT COUNT(user_id) FROM ga4_events',
        ['54,042', '22,835', '0', 'The number of distinct users'],
        1,
        'COUNT(col) counts non-NULL values. COUNT(*) would give 54,042 and COUNT(DISTINCT user_id) something smaller again.'),
      mcq('d4q3', 'What does AVG do with NULL values?',
        ['Treats them as zero', 'Skips them, shrinking the denominator', 'Returns NULL', 'Errors'],
        1,
        'Skipping is right for unsurveyed CSAT and wrong for a missing discount. Decide which case you are in.'),
      mcq('d4q4', 'Which columns must appear in GROUP BY?',
        ['All of them',
          'Every non-aggregated column in the SELECT list',
          'Only the first column',
          'None. It is optional'],
        1,
        'Otherwise the database cannot know which of the many bucketed values to show for that column.'),
    ],
    assessment: {
      passScore: 0.7,
      timeLimitSec: 900,
      questions: [
        mcq('d4a1', 'Your dashboard shows 6.6% CTR; the ad platform shows 0.96%. Most likely cause?',
          ['Different date ranges',
            'The dashboard averages per-row CTR instead of dividing the totals',
            'The platform excludes invalid clicks',
            'A timezone difference'],
          1,
          'All four are possible, but the AVG-of-rates error produces exactly this magnitude of gap and is by far the most common.'),
        mcq('d4a2', 'What is the difference between COUNTIF(x) and SUM(CASE WHEN x THEN 1 ELSE 0 END)?',
          ['None at all',
            'On an empty input COUNTIF returns 0 and SUM returns NULL',
            'COUNTIF is faster',
            'COUNTIF only works on booleans'],
          1,
          'They agree on non-empty input. The empty-input difference matters when a group legitimately has no matching rows.'),
        explain('d4a3', 'What does this query measure?',
          `SELECT SAFE_DIVIDE(SUM(unique_opens), SUM(delivered)) AS rate FROM email_campaigns`,
          ['Open rate over sends',
            'Open rate over delivered emails, correctly weighted by send size',
            'The average of each campaign\'s open rate',
            'Click-to-open rate'],
          1,
          'Delivered is the right denominator. A bounced email never had a chance to be opened. And the ratio-of-sums weights big sends properly.'),
      ],
      exerciseIds: ['4.9', '4.17'],
    },
    challenge: '4.22',
    reflection: [
      'Find a rate metric in a dashboard you use. Is it a ratio of sums or a mean of ratios?',
      'Which of your metrics has a denominator you have never actually checked?',
      'Where in your data would AVG skipping NULLs give a flattering answer?',
    ],
    project: {
      title: 'Channel scorecard',
      brief:
        'Build the paid-media scorecard: one row per channel, every volume metric and every ' +
        'rate correctly weighted. This is the report you will maintain for the rest of your career.',
      tasks: [
        task('score-google', 'Google scorecard',
          'Per `channel_type`, return `spend`, `impressions`, `clicks`, `ctr`, `cpc`, `conversions`, `cpa` and `roas`. Order by spend descending.',
          `SELECT c.channel_type,
       SUM(d.cost) AS spend,
       SUM(d.impressions) AS impressions,
       SUM(d.clicks) AS clicks,
       SAFE_DIVIDE(SUM(d.clicks), SUM(d.impressions)) AS ctr,
       SAFE_DIVIDE(SUM(d.cost), SUM(d.clicks)) AS cpc,
       SUM(d.conversions) AS conversions,
       SAFE_DIVIDE(SUM(d.cost), SUM(d.conversions)) AS cpa,
       SAFE_DIVIDE(SUM(d.conversion_value), SUM(d.cost)) AS roas
FROM google_ads_daily d
JOIN google_ads_campaigns c ON c.campaign_id = d.campaign_id
GROUP BY c.channel_type
ORDER BY spend DESC`,
          ['Volumes first, then every rate as a ratio of those sums.',
            'SAFE_DIVIDE on all four rates.'],
          { orderMatters: true }),
        task('score-blended', 'Blended across platforms',
          'From `ad_spend_daily`, return `platform`, `spend`, `clicks`, `ctr`, `cpc` and `cost_per_conversion`. Order by spend descending.',
          `SELECT platform,
       SUM(spend) AS spend,
       SUM(clicks) AS clicks,
       SAFE_DIVIDE(SUM(clicks), SUM(impressions)) AS ctr,
       SAFE_DIVIDE(SUM(spend), SUM(clicks)) AS cpc,
       SAFE_DIVIDE(SUM(spend), SUM(platform_conversions)) AS cost_per_conversion
FROM ad_spend_daily
GROUP BY platform
ORDER BY spend DESC`,
          ['The view already unions all three platforms.',
            'Remember a LinkedIn "conversion" is a lead, not a purchase. The columns are not comparable.'],
          { orderMatters: true }),
      ],
    },
  },

  // ══════════════════════════════════════════════════════════ DAY 5 ══
  {
    day: 5,
    module: 4,
    moduleTitle: 'Aggregation',
    title: 'GROUP BY, HAVING and the order the database really works in',
    subtitle: 'Where each clause runs, and why it matters',
    objective:
      'Split any metric by any dimension, filter the groups, and explain the logical query order ' +
      'from memory.',
    estimatedMinutes: 85,
    concepts: ['group-by', 'having', 'execution-order', 'rate-metrics'],
    theory: [
      h('The order everything runs in'),
      p('Write this down. It explains most of the errors you will hit for the next month:'),
      table(
        ['#', 'Clause', 'What it does'],
        [
          ['1', '`FROM` / `JOIN`', 'Assemble the rows'],
          ['2', '`WHERE`', 'Drop rows'],
          ['3', '`GROUP BY`', 'Collapse rows into groups'],
          ['4', '`HAVING`', 'Drop groups'],
          ['5', '`SELECT`', 'Compute the output columns and aliases'],
          ['6', '`ORDER BY`', 'Sort'],
          ['7', '`LIMIT`', 'Slice'],
        ],
        'Logical query order. You write SELECT first; the database runs it fifth.',
      ),
      key(
        'WHERE cannot see aggregates because they do not exist yet. ORDER BY can see aliases ' +
        'because SELECT has already run. That is the whole explanation.',
      ),
      h('HAVING vs WHERE'),
      p(
        'They do the same job at different stages. WHERE filters rows before grouping; HAVING ' +
        'filters groups after. Both can appear in the same query, and usually should. Filter ' +
        'rows as early as possible, then filter the groups.',
      ),
      compare(
        'Row-level condition',
        "WHERE channel_type = 'SEARCH'",
        'Group-level condition',
        'HAVING SUM(clicks) > 500',
        'The first cuts data before the work happens. The second can only be evaluated once the work is done. Putting an aggregate in WHERE is an error; putting a row condition in HAVING is legal but wasteful.',
      ),
      h('Grouping by an expression'),
      p(
        'You can GROUP BY anything you can SELECT: a CASE, a date truncation, a cleaned string. ' +
        'The catch is that the *same* expression must appear in both places, or the groups will ' +
        'not collapse the way the output suggests.',
      ),
      call(
        'trap',
        'Cleaning in SELECT but grouping on the raw column',
        '`SELECT INITCAP(TRIM(city)), COUNT(*) … GROUP BY city` produces a tidy-looking output ' +
        'where "London" appears four times, because the grouping still used the four dirty ' +
        'values. Clean in both places.',
      ),
      h('Minimum volume thresholds'),
      p(
        'Any rate computed on a small denominator is noise. A keyword with four clicks and no ' +
        'conversions has an infinite CPA and tells you nothing. HAVING is where you impose the ' +
        'floor: and you should choose the threshold before you look at the results, then state ' +
        'it in the report.',
      ),
    ],
    visual: {
      kind: 'execution-order',
      title: 'The pipeline, one clause at a time',
      caption:
        'Step through a query clause by clause and watch the row count change after each stage, ' +
        'from 19,341 raw rows down to the five that reach the output.',
    },
    examples: [
      {
        title: 'WHERE and HAVING together',
        question: 'Which search campaigns got real traffic in Q4?',
        sql: `SELECT d.campaign_id,
       SUM(d.clicks) AS clicks,
       SUM(d.conversions) AS conversions
FROM google_ads_daily d
JOIN google_ads_campaigns c ON c.campaign_id = d.campaign_id
WHERE c.channel_type = 'SEARCH'
  AND d.date >= '2024-10-01'
GROUP BY d.campaign_id
HAVING SUM(d.clicks) > 500
ORDER BY clicks DESC`,
        takeaway:
          'Channel and date are row conditions, so they go in WHERE and cut the data before the ' +
          'grouping. The click threshold is a property of the group, so it goes in HAVING.',
      },
      {
        title: 'Grouping by a computed band',
        question: 'How does spend distribute across Quality Score bands?',
        sql: `SELECT CASE
         WHEN k.quality_score IS NULL THEN 'unscored'
         WHEN k.quality_score <= 4 THEN '1-4'
         WHEN k.quality_score <= 7 THEN '5-7'
         ELSE '8-10' END AS quality_band,
       COUNT(DISTINCT k.keyword_id) AS keywords,
       SUM(kd.cost) AS spend
FROM google_ads_keywords k
LEFT JOIN google_ads_keyword_daily kd ON kd.keyword_id = k.keyword_id
GROUP BY quality_band
ORDER BY spend DESC`,
        takeaway:
          'The NULL branch has to come first, or unscored keywords fall through into the wrong ' +
          'band and you under-report your unmeasured inventory.',
      },
      {
        title: 'Cleaning before grouping',
        question: 'Which cities actually matter?',
        sql: `SELECT INITCAP(TRIM(city)) AS city,
       SUM(gross_revenue) AS revenue
FROM orders
WHERE status = 'completed'
GROUP BY INITCAP(TRIM(city))
HAVING SUM(gross_revenue) > 5000
ORDER BY revenue DESC`,
        takeaway:
          'The cleaning expression is repeated in GROUP BY. Without that, London stays split ' +
          'across four rows and might not clear the 5,000 threshold at all.',
      },
    ],
    playground: {
      prompt:
        'Try moving conditions between WHERE and HAVING. Put an aggregate in WHERE and read the ' +
        'error. Then group by `city` instead of `INITCAP(TRIM(city))` and count how many times ' +
        'London appears.',
      starter: `SELECT city, COUNT(*) AS orders
FROM orders
WHERE status = 'completed' AND LOWER(TRIM(city)) = 'london'
GROUP BY city
ORDER BY orders DESC`,
    },
    practice: ['4.23', '4.24', '4.25', '4.26', '4.27', '4.28', '4.29', '4.30', '4.31',
      '4.32', '4.33', '4.35'],
    quiz: [
      order('d5q1', 'Put the clauses in the order the database executes them.',
        ['FROM', 'WHERE', 'GROUP BY', 'HAVING', 'SELECT', 'ORDER BY', 'LIMIT'],
        'You write SELECT first and the database runs it fifth. Everything confusing about aliases and aggregates follows from this.'),
      debug('d5q2', 'This errors. Why?',
        `SELECT campaign_id, SUM(cost) AS spend
FROM google_ads_daily
WHERE SUM(cost) > 20000
GROUP BY campaign_id`,
        ['SUM needs a GROUP BY first',
          'WHERE runs before GROUP BY, so the aggregate does not exist yet. Use HAVING',
          'The alias should be quoted',
          'campaign_id must be aggregated'],
        1,
        'Move the condition to HAVING, which runs after aggregation.'),
      mcq('d5q3', 'You group by `city` but clean it only in SELECT. What happens?',
        ['The query errors',
          'The output looks clean but London still appears four times',
          'Nothing - SQL cleans it in both places',
          'The rows merge correctly'],
        1,
        'Grouping used the four dirty values. The display is cosmetic; the grouping is what counts.'),
      mcq('d5q4', 'Why impose a minimum-clicks threshold before ranking keywords by CPA?',
        ['To make the query faster',
          'Because a rate on a tiny denominator is noise, not signal',
          'Because HAVING requires a condition',
          'To exclude NULLs'],
        1,
        'And choose the threshold before you see the results, or you are fitting the filter to the answer you want.'),
    ],
    assessment: {
      passScore: 0.7,
      timeLimitSec: 900,
      questions: [
        mcq('d5a1', 'Which is the correct placement for "only campaigns that spent over 20,000"?',
          ['WHERE cost > 20000', 'HAVING SUM(cost) > 20000', 'WHERE SUM(cost) > 20000', 'ORDER BY SUM(cost)'],
          1,
          'It is a condition on a group total, so it belongs in HAVING. Option 1 filters individual days, which is a different question.'),
        mcq('d5a2', 'Which clause can reference a SELECT alias?',
          ['WHERE only', 'HAVING only', 'ORDER BY only', 'All three'],
          2,
          'ORDER BY runs after SELECT. WHERE and HAVING both run before it.'),
        explain('d5a3', 'What does the HAVING clause here accomplish?',
          `SELECT keyword_id, SAFE_DIVIDE(SUM(cost), SUM(conversions)) AS cpa
FROM google_ads_keyword_daily
GROUP BY keyword_id
HAVING SUM(clicks) >= 100 AND SUM(conversions) > 0`,
          ['It removes NULL keywords',
            'It ensures the CPA is both statistically meaningful and finite',
            'It speeds up the query',
            'It filters rows before grouping'],
          1,
          'The clicks floor makes the number meaningful; requiring at least one conversion keeps the denominator non-zero.'),
      ],
      exerciseIds: ['4.27', '4.37'],
    },
    challenge: '4.40',
    reflection: [
      'Recite the logical query order from memory. Which position surprised you?',
      'What minimum-volume threshold would you defend for keyword-level CPA, and why that number?',
      'Which dirty column in your own data needs cleaning inside the GROUP BY?',
    ],
    project: {
      title: 'Keyword efficiency report',
      brief:
        'Find the keywords worth acting on: enough volume to be meaningful, and performance ' +
        'worth changing a bid over.',
      tasks: [
        task('kw-worst', 'Worst CPA keywords',
          'Return `keyword_id`, `clicks`, `cost`, `conversions` and `cpa` for keywords with 100+ clicks and at least one conversion. Worst CPA first, top 20.',
          `SELECT keyword_id,
       SUM(clicks) AS clicks,
       SUM(cost) AS cost,
       SUM(conversions) AS conversions,
       SAFE_DIVIDE(SUM(cost), SUM(conversions)) AS cpa
FROM google_ads_keyword_daily
GROUP BY keyword_id
HAVING SUM(clicks) >= 100 AND SUM(conversions) > 0
ORDER BY cpa DESC, keyword_id
LIMIT 20`,
          ['Two conditions in HAVING, joined by AND.',
            'Requiring a conversion keeps the CPA finite.'],
          { orderMatters: true }),
        task('kw-zero', 'Zero-conversion keywords',
          'Return `keyword_id`, `clicks` and `cost` for keywords with 50+ clicks and no conversions all year. Highest cost first, top 20.',
          `SELECT keyword_id, SUM(clicks) AS clicks, SUM(cost) AS cost
FROM google_ads_keyword_daily
GROUP BY keyword_id
HAVING SUM(clicks) >= 50 AND SUM(conversions) = 0
ORDER BY cost DESC, keyword_id
LIMIT 20`,
          ['You can filter on an aggregate that is not in the SELECT list.',
            'Zero conversions across the whole year is the "returned nothing" test.'],
          { orderMatters: true }),
      ],
    },
  },
];
