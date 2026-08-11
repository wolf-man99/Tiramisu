import { ex } from './helpers';

/**
 * Module 1. How data is actually stored.
 *
 * Day 1 exercises are deliberately gentle on syntax and hard on *reading* a warehouse:
 * every one of them answers a structural question (what is the grain? is this key
 * unique? what values exist?) rather than a business question. The point is that by
 * the end of day 1 the learner can state the grain of any table they open.
 */
export const M01 = [
  ex('1.1', 1, 'easy',
    'Count the campaigns',
    'Your first query. The Google Ads account has one row per campaign in `google_ads_campaigns`. How many campaigns are there? Return a single column called `campaigns`.',
    ['google_ads_campaigns'], ['select', 'count', 'grain'],
    'SELECT COUNT(*) AS campaigns FROM google_ads_campaigns',
    [
      'Every query has the same skeleton: SELECT <what you want> FROM <where it lives>.',
      '`COUNT(*)` counts rows. You need it counted from the campaigns table.',
      'Give the result a name with `AS campaigns`.',
    ],
    {
      explanation:
        '24 campaigns. `COUNT(*)` counts rows, and because this table\'s grain is one row per campaign, counting rows and counting campaigns are the same thing. That equivalence is exactly what "grain" means, and it stops being true the moment you point COUNT(*) at a table with a different grain.',
    }),

  ex('1.2', 1, 'easy',
    'Prove the grain of a daily table',
    '`google_ads_daily` claims to have one row per date per ad group. Prove it. Return `row_count` and `distinct_combinations`, the number of distinct date + ad_group_id pairs. If the table\'s grain is what it claims, the two numbers are equal.',
    ['google_ads_daily'], ['grain', 'count', 'distinct'],
    `SELECT COUNT(*) AS row_count,
       COUNT(DISTINCT date || '|' || ad_group_id) AS distinct_combinations
FROM google_ads_daily`,
    [
      'You need two numbers side by side, so two expressions in one SELECT.',
      '`COUNT(DISTINCT x)` counts unique values of x. But you need unique *pairs*.',
      'Glue the two columns into one string with `||` and a separator, then COUNT DISTINCT that.',
    ],
    {
      explanation:
        'The two numbers match, so the grain is confirmed: date × ad_group is unique. This is the first thing to do with any unfamiliar table. The separator in `date || \'|\' || ad_group_id` is not decoration: without it, ("2024-01-1", "23") and ("2024-01-12", "3") would collide.',
      trap: 'COUNT(DISTINCT date), COUNT(DISTINCT ad_group_id) does not prove uniqueness of the pair.',
    }),

  ex('1.3', 1, 'easy',
    'Find the broken primary key',
    '`orders` is supposed to have one row per order, with `order_id` as its primary key. Return `total_rows` and `distinct_order_ids`. What you find is a real defect in this warehouse.',
    ['orders'], ['grain', 'count', 'distinct'],
    'SELECT COUNT(*) AS total_rows, COUNT(DISTINCT order_id) AS distinct_order_ids FROM orders',
    [
      'Same shape as the last exercise, but the key is a single column this time.',
      'COUNT(*) counts rows; COUNT(DISTINCT order_id) counts unique orders.',
    ],
    {
      explanation:
        '6,610 rows but only 6,584 distinct order_ids: 26 orders appear twice, from a webhook that replayed. Every revenue number you compute from this table without deduplicating is overstated. This is not a contrived teaching example; it is the single most common data defect in commerce warehouses.',
      trap: 'Assuming a column named *_id is unique because it is named *_id.',
    }),

  ex('1.4', 1, 'easy',
    'Read a dimension table',
    'The `products` table is a *dimension*: it describes things, it does not measure events. Return `product_id`, `product_name`, `category`, `unit_cost` and `list_price` for every product.',
    ['products'], ['select', 'grain'],
    'SELECT product_id, product_name, category, unit_cost, list_price FROM products',
    [
      'List the columns you want after SELECT, separated by commas.',
      'No filter is needed. You want every product.',
    ],
    {
      explanation:
        'Dimensions are small, wide and slow-changing. Facts (like `orders` or `google_ads_daily`) are tall, narrow and append-only. Almost every analytical query joins one to the other: a fact for the numbers, a dimension for the labels.',
    }),

  ex('1.5', 1, 'easy',
    'A computed column',
    'Columns do not have to exist in the table. Return `product_name`, `list_price`, `unit_cost`, and a fourth column `unit_margin` computed as list price minus unit cost.',
    ['products'], ['select', 'alias'],
    'SELECT product_name, list_price, unit_cost, list_price - unit_cost AS unit_margin FROM products',
    [
      'You can put arithmetic directly in the SELECT list.',
      'Name the result with `AS unit_margin`, or the column comes back with an ugly generated name.',
    ],
    {
      explanation:
        'A derived column is computed at query time and stored nowhere. This is why "the number in the dashboard" and "the number in the table" can differ: the dashboard is running arithmetic your table has never seen.',
    }),

  ex('1.6', 1, 'easy',
    'What values actually exist?',
    'Before filtering on a column you must know what is in it. Return every distinct `channel_type` in `google_ads_campaigns`, one per row, in alphabetical order.',
    ['google_ads_campaigns'], ['distinct', 'order-by'],
    'SELECT DISTINCT channel_type FROM google_ads_campaigns ORDER BY channel_type',
    [
      '`SELECT DISTINCT col` collapses duplicate values into one row each.',
      'Add `ORDER BY channel_type` to sort them.',
    ],
    { orderMatters: true,
      explanation:
        'DISPLAY, PMAX, SEARCH, SHOPPING, VIDEO. Running this before you write a WHERE clause saves you from the most demoralising bug in analytics: filtering on `channel_type = \'Search\'` and getting zero rows because the data says `SEARCH`.' }),

  ex('1.7', 1, 'medium',
    'Foreign keys connect tables',
    '`google_ads_ad_groups.campaign_id` is a foreign key pointing at `google_ads_campaigns.campaign_id`. Return every distinct `campaign_id` that appears in the ad groups table, sorted ascending, so you can see the connection is real.',
    ['google_ads_ad_groups'], ['distinct', 'order-by', 'grain'],
    'SELECT DISTINCT campaign_id FROM google_ads_ad_groups ORDER BY campaign_id',
    [
      'You only need one table here, the foreign key column lives inside it.',
      'DISTINCT, because a campaign has several ad groups.',
    ],
    { orderMatters: true,
      explanation:
        'A foreign key is just a column holding values that exist as keys in another table. There is no magic and, in most warehouses, including BigQuery, no enforcement. Nothing stops a fact row from referencing a dimension row that does not exist, which is why this warehouse contains orders pointing at campaigns that were deleted.' }),

  ex('1.8', 1, 'medium',
    'The same entity at three grains',
    'One customer can appear in several tables at different grains. Return three counts in one row: `customer_rows` from `customers`, `order_rows` from `orders`, and `order_item_rows` from `order_items`.',
    ['customers', 'orders', 'order_items'], ['grain', 'count', 'subquery'],
    `SELECT (SELECT COUNT(*) FROM customers)    AS customer_rows,
       (SELECT COUNT(*) FROM orders)       AS order_rows,
       (SELECT COUNT(*) FROM order_items)  AS order_item_rows`,
    [
      'Three different tables, one row of output, so you cannot use a single FROM.',
      'A query in parentheses that returns exactly one value can be used anywhere a value can.',
      'Put each `(SELECT COUNT(*) FROM …)` directly in the SELECT list.',
    ],
    {
      explanation:
        '5,200 customers → 6,610 orders → 10,834 line items. Each step down is a finer grain, and each step multiplies rows. Every fan-out bug in this course comes from summing a number at the wrong level of that ladder, and on day 7 you will inflate revenue by 1.8× doing exactly that.',
      trap: 'Trying to FROM three tables at once and getting a cross join of 5,200 × 6,610 × 10,834 rows.',
    }),
];
