Score 1 if the response contains a table, or an equivalent explicit list, mapping every requirement
identifier to BOTH a named code symbol that will own the rule AND an architectural layer
(domain, application, infrastructure, interface, or the equivalents this project uses).

Score 0 if requirements appear without a named owning symbol, if the layer is left implicit, or if
the response lists only files rather than symbols.

A requirement enumerated without a home scores 0 even when the enumeration is otherwise complete.
The property under test is that the rule has an owner before it is written, not that requirements
exist.
