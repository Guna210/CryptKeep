# M03 combat defaults — orchestrator design

These initial values fill numeric details left open by SPEC 5.2. They are implementation defaults, not measured balance. SPEC and owner scope remain authoritative. Generated enemies arrive in M04; M03 uses explicitly labeled development training targets.

| Sword attack | Damage | Release stamina cost | Committed windup | Active window | Recovery | Reach / full arc |
| --- | --- | --- | --- | --- | --- | --- |
| Light | 18 | 10 | 0.06 s | 0.12 s | 0.30 s | 2.0 m / 90 degrees |
| Heavy | 30 to 54 | 18 to 30 | 0.10 s | 0.16 s | 0.50 s | 2.0 m / 90 degrees |

A press starts anticipation without damage or cost. Release below 0.25 s commits a light attack; release at or above 0.25 s commits heavy. For heavy power, `q = clamp((heldSeconds - 0.25) / (1.2 - 0.25), 0, 1)`, damage is `30 + 24*q`, and cost is `18 + 12*q`. Charge stops growing at 1.2 s; holding never auto-fires. Damage is requested once when committed windup reaches the active window; resource cost commits once at an accepted release. Subsequent active ticks may query movement/targets with the same attack ID; the shared resolver enforces once per target. Recovery rejects new attack initiation. An insufficient-resource release returns cleanly to idle without damage or cost.

Explicit input cancellation returns to idle, clears pending charge and never acts as release. Committed costs and damage are not refunded. Pause cancels pending weapon state immediately before further simulation; returning to play requires fresh input. UI/render read simulation state and cannot create attacks. Attack IDs must remain unique across weapon cancellation/restart during one floor runtime. The command's ordered action edges preserve a complete tap occurring within one fixed tick.

CK-03-03 introduces only usable interfaces and a sword dispatcher; CK-03-04 initially implements release-driven light timing, and CK-03-05 adds the threshold and heavy curve above. No guard/parry logic is introduced until its assigned M10 task. The later M03 integration shares player stamina and regeneration timers with sprint/dash; separate copies of the resource pool are prohibited.
