(module (import "env" "memory" (memory 256 65536 shared))  (import "env" "gcall" (func $gcall (param i32 i32 i32 i32 i32))) (func (export "step") (param $cpu i32) (local $old1 i32) (local $old2 i32) (local $old3 i32) (local $old4 i32) (local $old5 f32) (local $old6 i32) (local $old7 f64) (local $old8 i32) (local $old9 i32) (local $old10 i32) (local $old11 i32) (local $old12 i32) (local $old13 i32) (local $old14 i32) (local $old15 i32) (local $old16 i32) (local $old17 i32) (local $old18 i32) (local $old19 v128) (local $old20 i32) (local $old21 i32) (local $old22 i32) (local $old23 f64) (local $old24 i32) (local $old25 i32) (local $old26 i32) (local $old27 i32) (local $old28 i32) (local $old29 v128) (local $old30 i32) (local $old31 v128) (local $p i32) (local $car i32) (local $race i32) (local $want i32) (local $seq i32) (local $hb i32) (local $stale i32) (local $owned i32) (local $kind i32) (local $rec i32) 
(block $done
 ;; Only the documented main-loop caller, on the game thread under its own lock.
 (br_if $done (i32.ne (i32.load (i32.load offset=16 (local.get $cpu))) (i32.const 0x581475)))
 (i32.store (i32.const 13685020) (i32.const 927547726))
 ;; Page owns command words 0..24, pace percent at 60 and online opt-in at 84 and experimental drag opt-in at 88. Game owns all others.
 (br_if $done (i32.ne (i32.load (i32.const 13684992)) (i32.const 927547726)))
 (local.set $hb (i32.load (i32.const 13685016)))
 (local.set $stale (i32.add (i32.load (i32.const 13685040)) (i32.const 1)))
 (if (i32.ne (local.get $hb) (i32.load (i32.const 13685036))) (then (local.set $stale (i32.const 0))))
 (i32.store (i32.const 13685036) (local.get $hb)) (i32.store (i32.const 13685040) (local.get $stale))
 (local.set $seq (i32.load (i32.const 13684996)))
 ;; An interrupted page writer is allowed only briefly; the heartbeat still expires.
 (br_if $done (i32.and (i32.and (local.get $seq) (i32.const 1)) (i32.lt_u (local.get $stale) (i32.const 180))))
 (local.set $p (i32.load (i32.const 13631488)))
 (local.set $race (i32.load (i32.const 8978712)))
 (local.set $car (i32.const 0))
 (local.set $kind (i32.const 0))
 (local.set $want (i32.const 0))
 (block $invalid
  (br_if $invalid (i32.ne (i32.load (i32.const 8803492)) (i32.const 6)))
  (br_if $invalid (i32.eqz (i32.and (i32.ge_u (local.get $p) (i32.const 65536)) (i32.and (i32.lt_u (local.get $p) (i32.const 0x27fff000)) (i64.lt_u (i64.extend_i32_u (local.get $p)) (i64.sub (i64.shl (i64.extend_i32_u (memory.size)) (i64.const 16)) (i64.const 4096)))))))
  (local.set $car (i32.load offset=4 (local.get $p)))
  (br_if $invalid (i32.eqz (i32.and (i32.ge_u (local.get $car) (i32.const 65536)) (i32.and (i32.lt_u (local.get $car) (i32.const 0x27fff000)) (i64.lt_u (i64.extend_i32_u (local.get $car)) (i64.sub (i64.shl (i64.extend_i32_u (memory.size)) (i64.const 16)) (i64.const 4096)))))))
  (local.set $kind (i32.load offset=36 (local.get $car)))
  (br_if $invalid (i32.eqz (i32.and (i32.ge_u (local.get $race) (i32.const 65536)) (i32.and (i32.lt_u (local.get $race) (i32.const 0x27fff000)) (i64.lt_u (i64.extend_i32_u (local.get $race)) (i64.sub (i64.shl (i64.extend_i32_u (memory.size)) (i64.const 16)) (i64.const 4096)))))))
  (br_if $invalid (i32.ne (i32.load offset=16 (local.get $p)) (i32.const 0)))
  (br_if $invalid (i32.ne (i32.load (i32.const 13631536)) (i32.const 1)))
  (br_if $invalid (i32.ne (i32.load (local.get $race)) (i32.const 4)))
  ;; Only this extension's online guard is optional. Native network state stays untouched.
  (if (i32.ne (i32.load (i32.const 13685076)) (i32.const 1)) (then
   (br_if $invalid (i32.and (i32.load (i32.const 8716408)) (i32.const 520)))
   (br_if $invalid (i32.load (i32.const 8808980)))
   (br_if $invalid (i32.load (i32.const 8808948)))
   (br_if $invalid (i32.load8_u (i32.const 0x89cf69)))))
  ;; Drag opponents use driver 3 with full physics 1 (0x5f6d50 -> 0x5f4400).
  ;; Player::AutoPilotOn instead requests physics 3; correct it only under a separate opt-in.
  (if (i32.load8_u (i32.const 0x89e7d8)) (then
   (br_if $invalid (i32.ne (i32.load (i32.const 13685080)) (i32.const 1)))
   (br_if $invalid (i32.ne (i32.load offset=40 (local.get $car)) (i32.const 1)))
   (br_if $invalid (i32.eqz (i32.load8_u offset=1472 (local.get $car))))))
  (br_if $invalid (i32.gt_u (local.get $stale) (i32.const 179)))
  (br_if $invalid (i32.and (local.get $seq) (i32.const 1)))
  (br_if $invalid (i32.ne (i32.load (i32.const 13685004)) (local.get $p)))
  (br_if $invalid (i32.ne (i32.load (i32.const 13685008)) (local.get $car)))
  (br_if $invalid (i32.ne (i32.load (i32.const 13685012)) (local.get $race)))
  (local.set $want (i32.and (i32.ge_u (i32.load (i32.const 13685000)) (i32.const 1)) (i32.le_u (i32.load (i32.const 13685000)) (i32.const 2))))
  (if (i32.ne (local.get $seq) (i32.load (i32.const 13684996))) (then (local.set $want (i32.const 0))))
 )
 (local.set $owned (i32.load (i32.const 13685028)))
 ;; A transition, failed guard, stopped page heartbeat or OFF hands back only our still-live car.
 (if (local.get $owned)
  (then
   (if (i32.eqz (i32.and (local.get $want)
     (i32.and (i32.eq (i32.load (i32.const 13685024)) (local.get $p))
      (i32.and (i32.eq (local.get $owned) (local.get $car))
       (i32.and (i32.eq (i32.load (i32.const 13685032)) (local.get $race)) (i32.eq (local.get $kind) (i32.const 3)))))))
    (then
     (if (i32.and (i32.eq (i32.load (i32.const 8803492)) (i32.const 6))
       (i32.and (i32.and (i32.ge_u (local.get $car) (i32.const 65536)) (i32.and (i32.lt_u (local.get $car) (i32.const 0x27fff000)) (i64.lt_u (i64.extend_i32_u (local.get $car)) (i64.sub (i64.shl (i64.extend_i32_u (memory.size)) (i64.const 16)) (i64.const 4096)))))
        (i32.and (i32.eq (i32.load (i32.const 13685024)) (local.get $p)) (i32.eq (local.get $owned) (local.get $car)))))
      (then
       
 (if (i32.and (i32.and (i32.ge_u (i32.load (i32.const 13685056)) (i32.const 65536)) (i32.and (i32.lt_u (i32.load (i32.const 13685056)) (i32.const 0x27fff000)) (i64.lt_u (i64.extend_i32_u (i32.load (i32.const 13685056))) (i64.sub (i64.shl (i64.extend_i32_u (memory.size)) (i64.const 16)) (i64.const 4096))))) (i32.eq (i32.load offset=20 (local.get $car)) (i32.load (i32.const 13685056))))
  (then (if (i32.eq (i32.load8_u offset=2305 (i32.load (i32.const 13685056))) (i32.const 9))
   (then (i32.store8 offset=2305 (i32.load (i32.const 13685056)) (i32.load (i32.const 13685060)))))))
       (if (i32.eq (local.get $kind) (i32.const 3))
        (then (call $gcall (local.get $cpu) (i32.const 6270736) (local.get $p) (i32.const 0) (i32.const 0)) (i32.store (i32.const 13685048) (i32.const 2)) (call $gcall (local.get $cpu) (i32.const 6315120) (local.get $p) (i32.const 1) (i32.const 13685048))))
      ))
     (i32.store (i32.const 13685024) (i32.const 0)) (i32.store (i32.const 13685028) (i32.const 0)) (i32.store (i32.const 13685032) (i32.const 0)) (i32.store (i32.const 13685056) (i32.const 0)) (i32.store (i32.const 13685044) (i32.const 0)) (i32.store (i32.const 13685068) (i32.const 0)) (i32.store (i32.const 13685072) (i32.const 0))
     (local.set $kind (i32.const 0))
    ))
  ))
 (if (i32.eqz (i32.load (i32.const 13685000))) (then (i32.store (i32.const 13685064) (i32.const 0))))
 ;; Never commandeer an AI car that the extension did not acquire.
 (if (i32.and (local.get $want) (i32.eqz (i32.load (i32.const 13685028))))
  (then
   (if (i32.and (i32.eq (local.get $kind) (i32.const 1)) (i32.ne (i32.load (i32.const 13685064)) (local.get $car)))
    (then
     (block $acquire
     (local.set $rec (i32.load offset=20 (local.get $car)))
     (br_if $acquire (i32.eqz (i32.and (i32.ge_u (local.get $rec) (i32.const 65536)) (i32.and (i32.lt_u (local.get $rec) (i32.const 0x27fff000)) (i64.lt_u (i64.extend_i32_u (local.get $rec)) (i64.sub (i64.shl (i64.extend_i32_u (memory.size)) (i64.const 16)) (i64.const 4096)))))))
     (if (i32.and (i32.ge_u (local.get $rec) (i32.const 65536)) (i32.and (i32.lt_u (local.get $rec) (i32.const 0x27fff000)) (i64.lt_u (i64.extend_i32_u (local.get $rec)) (i64.sub (i64.shl (i64.extend_i32_u (memory.size)) (i64.const 16)) (i64.const 4096)))))
      (then (if (i32.le_u (i32.load8_u offset=2305 (local.get $rec)) (i32.const 9))
       (then
        (i32.store (i32.const 13685056) (local.get $rec))
        (i32.store (i32.const 13685060) (i32.load8_u offset=2305 (local.get $rec)))
        (i32.store8 offset=2305 (local.get $rec) (i32.const 9))
       ))))
     (call $gcall (local.get $cpu) (i32.const 6270496) (local.get $p) (i32.const 0) (i32.const 0))
     (if (i32.and (i32.load8_u (i32.const 0x89e7d8))
       (i32.eq (i32.load offset=36 (local.get $car)) (i32.const 3)))
      (then (i32.store (i32.const 13685048) (i32.const 1)) (call $gcall (local.get $cpu) (i32.const 0x5f46a0) (local.get $car) (i32.const 1) (i32.const 13685048))))
     (if (i32.and (i32.eq (i32.load offset=36 (local.get $car)) (i32.const 3))
       (i32.or (i32.eqz (i32.load8_u (i32.const 0x89e7d8)))
        (i32.eq (i32.load offset=40 (local.get $car)) (i32.const 1))))
      (then
       (i32.store (i32.const 13685024) (local.get $p)) (i32.store (i32.const 13685028) (local.get $car)) (i32.store (i32.const 13685032) (local.get $race))
       (i32.store (i32.const 13685044) (i32.const 1))
      )
      (else
       ;; A rejected physics correction must not strand an unowned AI driver.
       (if (i32.eq (i32.load offset=36 (local.get $car)) (i32.const 3))
        (then (call $gcall (local.get $cpu) (i32.const 6270736) (local.get $p) (i32.const 0) (i32.const 0)) (i32.store (i32.const 13685048) (i32.const 2)) (call $gcall (local.get $cpu) (i32.const 6315120) (local.get $p) (i32.const 1) (i32.const 13685048))))
       
 (if (i32.and (i32.and (i32.ge_u (i32.load (i32.const 13685056)) (i32.const 65536)) (i32.and (i32.lt_u (i32.load (i32.const 13685056)) (i32.const 0x27fff000)) (i64.lt_u (i64.extend_i32_u (i32.load (i32.const 13685056))) (i64.sub (i64.shl (i64.extend_i32_u (memory.size)) (i64.const 16)) (i64.const 4096))))) (i32.eq (i32.load offset=20 (local.get $car)) (i32.load (i32.const 13685056))))
  (then (if (i32.eq (i32.load8_u offset=2305 (i32.load (i32.const 13685056))) (i32.const 9))
   (then (i32.store8 offset=2305 (i32.load (i32.const 13685056)) (i32.load (i32.const 13685060))))))) (i32.store (i32.const 13685056) (i32.const 0)) (i32.store (i32.const 13685064) (local.get $car)) (i32.store (i32.const 13685044) (i32.const 3))))
     )
    )
   )
  ))
) ))