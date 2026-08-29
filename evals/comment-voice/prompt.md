Write a function that retries an HTTP call. The payment provider we use returns 200 with an empty
body when it is rate limiting, so a 200 alone does not mean success. Retry on that case and on
connection resets, but never on a 400.

Comment the code well.
