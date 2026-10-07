# M03 feedback defaults — orchestrator decisions

CK-03-08 implements a reusable HUD/feedback component; CK-03-09 connects it to live player and combat state. These choices fill in the task boundaries without implementing future enemy AI or settings persistence.

The HUD displays actual current/maximum health, stamina and mana, a centered reticle, and sword charge from the accepted sword selectors. Show charge during anticipation, then clear it on release/cancellation. Use text and bounded bars so color alone does not communicate resources. Low-health presentation applies at or below 25% of nonzero maximum health. Zero maximum and empty resources must display finite values.

For physical `damage-applied` events, show a hit marker only when the player is the source and a different entity is the target. Incoming damage produces hurt feedback only when the player is the target. Events involving other actors do not produce player feedback. Consume actual immutable event batches, not a parallel mock damage system.

A hit marker lasts at most 0.15 seconds after the latest relevant event. Hurt feedback lasts at most 0.25 seconds, with overlay opacity capped at 0.22. Repeated relevant events restart the bounded timer rather than stacking opacity or creating timers/listeners. Time advances through an explicit seconds-based presentation update; pause freezes presentation timers and resume must not advance hidden wall time. Disabling damage flashes suppresses the hurt overlay immediately, while resource values, low-health status and hit-marker feedback remain readable. This is a component option until later settings work.

The component owns its DOM and subscription teardown, but not the caller's event collector, world renderer or simulation resources. Repeated updates must not add subscriptions/listeners, and disposal must be idempotent. No intervals, extra global input listeners, damage side effects or private resource pool are needed.

Required evidence is a labeled component fixture using actual resource snapshots and real damage events, browser assertions for HUD values/charge/timers/disabled flashes/disposal, and an inspected screenshot. It establishes component behavior; trusted native sword interaction is the separate CK-03-09 gate. A fresh independent Luna reviewer verifies each card, with the existing maximum of three review/repair rounds.
