;; Runs once, only in the successful acquisition branch after ownership and physics1.
;; NULL is initialized lazily by native update. Temporary route action11 is untouched.
(block $initialDrag
 (br_if $initialDrag (i32.eqz (i32.load8_u (i32.const 0x89e7d8))))
 (local.set $rec (i32.load offset=44 (local.get $car)))
 (br_if $initialDrag (i32.eqz PTR_DRIVER))
 (br_if $initialDrag (i32.ne (i32.load (local.get $rec)) (i32.const 0x785370)))
 (br_if $initialDrag (i32.ne (i32.load offset=4 (local.get $rec)) (local.get $car)))
 (br_if $initialDrag (i32.eqz PTR_CONFIG))
 (br_if $initialDrag (i32.eqz PTR_ACTION))
 (br_if $initialDrag (i32.ne (i32.load (i32.load offset=1788 (local.get $rec))) (i32.const 0x784830)))
 (br_if $initialDrag (i32.ne (i32.load offset=20 (i32.load offset=1788 (local.get $rec))) (i32.const 3)))
 ;; Use the native initializer and its native cleanup/constructor path; patched selector is independently guarded.
 (call $gcall (local.get $cpu) (i32.const 0x42c060) (local.get $rec) (i32.const 0) (i32.const 0))
)
