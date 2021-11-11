IPv4:

- ipv4 is usage of libfancy
- ipv4 can be transitioned into over time, rather than an all-or-nothing
  approach like ipv3 was

GOALS:

- libfancy

NOTES:

- when I rewrite `$wr` and similar src commands:
  - I can use a like 10min cache or something but critical thing:
    keep around the previous cache and use invalidated data.
    after using the invalidated data, fetch the current data
    and edit the response when the updated data is available.
- more notes are available in the #todo channel on the support server