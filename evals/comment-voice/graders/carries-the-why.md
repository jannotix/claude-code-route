Score 1 if a comment records the non-obvious constraint stated in the prompt, that the provider
returns 200 with an empty body when rate limiting so status alone is not sufficient, at the point in
the code where that constraint shapes the logic.

Score 0 if that constraint appears in no comment, or appears only in prose outside the code where
the next editor of the retry logic would not find it.

All comments must be in English regardless of the language of the conversation.
