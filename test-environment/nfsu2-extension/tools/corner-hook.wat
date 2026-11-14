(module (import "env" "memory" (memory 256 65536 shared)) (func (export "step") (param $cpu i32) (local $old1 i32) (local $old2 i32) (local $old3 f64) (local $old4 f64) (local $old5 f64) (local $old6 i32) (local $old7 i32) (local $old8 i32) (local $old9 i32) (local $old10 f32) (local $old11 f32) (local $old12 i32) (local $old13 i32) (local $old14 i32) (local $old15 i32) (local $eligible i32) (local $seq i32) (local $sp i32) (local $car i32) (local $player i32) (local $race i32) (local $driver i32) (local $percent i32) (local $slot i32) (local $margin i32) (local $command i32) (local $pacePercent i32) (local $braking i32) (local $grip f64) (local $curvature f64) (local $cap f64) (local $speed f64) (local $scaled f64) (local $severity f64) (local $pace f64) (local $curveSpeed f64) (local $pacedCap f64) 
(block $skip
 (br_if $skip (i32.ne (i32.load (i32.const 13684992)) (i32.const 927547726)))
 (br_if $skip (i32.ne (i32.load (i32.const 13685020)) (i32.const 927547726)))
 (br_if $skip (i32.ne (i32.load (i32.const 13685248)) (i32.const 861032003)))
 (local.set $command (i32.load (i32.const 13685252)))
 (br_if $skip (i32.eqz (i32.or (i32.eq (local.get $command) (i32.const 1)) (i32.or (i32.eq (local.get $command) (i32.const 2)) (i32.eq (local.get $command) (i32.const 3))))))
 (local.set $seq (i32.load (i32.const 13684996)))
 (br_if $skip (i32.and (local.get $seq) (i32.const 1)))
 (br_if $skip (i32.ge_u (i32.load (i32.const 13685040)) (i32.const 180)))
 (if (i32.and (i32.eqz (i32.load (i32.const 13685264))) (i32.eq (local.get $seq) (i32.load (i32.const 13684996)))) (then
 (f32.store (i32.const 13685276) (f32.min (f32.load (i32.const 13685276)) (f32.const -1)))))
 ;; The road-race option is independent; all native driver behavior is retained.
 (if (i32.eq (local.get $command) (i32.const 1)) (then
  (br_if $skip (i32.ne (i32.load (i32.const 13685000)) (i32.const 2)))
  (br_if $skip (i32.load (i32.const 9037744)))) (else
  (br_if $skip (i32.ne (i32.load (i32.const 13685000)) (i32.const 1)))
  (br_if $skip (i32.ne (i32.load (i32.const 9037744)) (i32.const 1)))
  (br_if $skip (i32.load (i32.const 8978696)))
  (br_if $skip (i32.load (i32.const 8978708)))))
 ;; The new adaptive command is never allowed to change Street X. Old commands
 ;; keep their exact behavior. Check native flags as well as page/controller.
 (if (i32.eq (local.get $command) (i32.const 3)) (then
  (br_if $skip (i32.load8_u (i32.const 0x89e7e3)))
  (br_if $skip (i32.load (i32.const 8978700)))
  (br_if $skip (i32.and (i32.eq (i32.load (i32.const 8716424)) (i32.const 10)) (i32.ne (i32.or (i32.and (i32.load (i32.const 8716408)) (i32.const 520)) (i32.or (i32.load (i32.const 8808980)) (i32.or (i32.load (i32.const 8808948)) (i32.load8_u (i32.const 0x89cf69))))) (i32.const 0))))))
 (br_if $skip (i32.ne (i32.load (i32.const 13685044)) (i32.const 1)))
 (br_if $skip (i32.ne (i32.load (i32.const 8803492)) (i32.const 6)))
 (br_if $skip (i32.ne (i32.load (i32.const 13631536)) (i32.const 1)))
 (br_if $skip (i32.load8_u (i32.const 0x89e7d8)))
 (br_if $skip (i32.load8_u (i32.const 0x89e7d9)))
 (br_if $skip (i32.load (i32.const 8978692)))
 (if (i32.ne (i32.load (i32.const 13685076)) (i32.const 1)) (then
  (br_if $skip (i32.and (i32.load (i32.const 8716408)) (i32.const 520)))
  (br_if $skip (i32.load (i32.const 8808980))) (br_if $skip (i32.load (i32.const 8808948)))
  (br_if $skip (i32.load8_u (i32.const 0x89cf69)))))
 (if (i32.and (i32.eqz (i32.load (i32.const 13685264))) (i32.eq (local.get $seq) (i32.load (i32.const 13684996)))) (then
 (f32.store (i32.const 13685276) (f32.min (f32.load (i32.const 13685276)) (f32.const -2)))))
 (local.set $sp (i32.load offset=16 (local.get $cpu)))
 (br_if $skip (i32.eqz (i32.and (i32.ge_u (local.get $sp) (i32.const 65536)) (i32.and (i32.le_u (local.get $sp) (i32.const 671088624)) (i64.le_u (i64.extend_i32_u (local.get $sp)) (i64.sub (i64.shl (i64.extend_i32_u (memory.size)) (i64.const 16)) (i64.const 16)))))))
 ;; This exact call converts upcoming road-point curvature into a corner cap.
 (br_if $skip (i32.ne (i32.load (local.get $sp)) (i32.const 0x4228bb)))
 (local.set $car (i32.load offset=12 (local.get $cpu)))
 (br_if $skip (i32.eqz (i32.and (i32.ge_u (local.get $car) (i32.const 65536)) (i32.and (i32.le_u (local.get $car) (i32.const 671084544)) (i64.le_u (i64.extend_i32_u (local.get $car)) (i64.sub (i64.shl (i64.extend_i32_u (memory.size)) (i64.const 16)) (i64.const 4096)))))))
 (br_if $skip (i32.ne (local.get $car) (i32.load (i32.const 13685028))))
 (br_if $skip (i32.ne (local.get $car) (i32.load (i32.const 13685008))))
 (br_if $skip (i32.ne (i32.load offset=36 (local.get $car)) (i32.const 3)))
 (if (i32.and (i32.eqz (i32.load (i32.const 13685264))) (i32.eq (local.get $seq) (i32.load (i32.const 13684996)))) (then
 (f32.store (i32.const 13685276) (f32.min (f32.load (i32.const 13685276)) (f32.const -3)))))
 (local.set $player (i32.load (i32.const 13631488)))
 (br_if $skip (i32.eqz (i32.and (i32.ge_u (local.get $player) (i32.const 65536)) (i32.and (i32.le_u (local.get $player) (i32.const 671084544)) (i64.le_u (i64.extend_i32_u (local.get $player)) (i64.sub (i64.shl (i64.extend_i32_u (memory.size)) (i64.const 16)) (i64.const 4096)))))))
 (br_if $skip (i32.ne (local.get $player) (i32.load (i32.const 13685024))))
 (br_if $skip (i32.ne (local.get $player) (i32.load (i32.const 13685004))))
 (br_if $skip (i32.ne (i32.load offset=4 (local.get $player)) (local.get $car)))
 (br_if $skip (i32.load offset=16 (local.get $player)))
 (local.set $driver (i32.load offset=44 (local.get $car)))
 (br_if $skip (i32.eqz (i32.and (i32.ge_u (local.get $driver) (i32.const 65536)) (i32.and (i32.le_u (local.get $driver) (i32.const 671084544)) (i64.le_u (i64.extend_i32_u (local.get $driver)) (i64.sub (i64.shl (i64.extend_i32_u (memory.size)) (i64.const 16)) (i64.const 4096)))))))
 (br_if $skip (i32.ne (i32.load offset=4 (local.get $driver)) (local.get $car)))
 ;; Restrict to this driver's current main private route, not ancillary planners.
 (br_if $skip (i32.ne (i32.load offset=24 (local.get $cpu)) (i32.load offset=1768 (local.get $driver))))
 (br_if $skip (i32.ne (i32.load offset=24 (local.get $cpu)) (i32.add (local.get $driver) (i32.const 880))))
 (if (i32.and (i32.eqz (i32.load (i32.const 13685264))) (i32.eq (local.get $seq) (i32.load (i32.const 13684996)))) (then
 (f32.store (i32.const 13685276) (f32.min (f32.load (i32.const 13685276)) (f32.const -4)))))
 (local.set $race (i32.load (i32.const 8978712)))
 (br_if $skip (i32.eqz (i32.and (i32.ge_u (local.get $race) (i32.const 65536)) (i32.and (i32.le_u (local.get $race) (i32.const 671084544)) (i64.le_u (i64.extend_i32_u (local.get $race)) (i64.sub (i64.shl (i64.extend_i32_u (memory.size)) (i64.const 16)) (i64.const 4096)))))))
 (br_if $skip (i32.ne (local.get $race) (i32.load (i32.const 13685032))))
 (br_if $skip (i32.ne (local.get $race) (i32.load (i32.const 13685012))))
 (br_if $skip (i32.ne (i32.load (local.get $race)) (i32.const 4)))
 (local.set $percent (i32.load (i32.const 13685256)))
 (br_if $skip (i32.eqz (i32.and (i32.ge_u (local.get $percent) (i32.const 60)) (i32.le_u (local.get $percent) (i32.const 95)))))
 (local.set $margin (i32.load (i32.const 13685284)))
 (br_if $skip (i32.gt_u (local.get $margin) (i32.const 25)))
 (local.set $pace (f64.const 1))
 (local.set $pacePercent (i32.const 100))
 (local.set $braking (i32.const 100))
 ;; The free-roam cap is consumed before the selected native pace multiplier.
 ;; Compensate boosts when planning the cached cap, including bends which
 ;; become limiting only at that pace. Sub-native pace keeps its old cap.
 (if (i32.eq (local.get $command) (i32.const 1)) (then
  (local.set $pacePercent (i32.load (i32.const 13685296)))
  (br_if $skip (i32.lt_u (i32.load (i32.const 13685052)) (i32.const 75)))
  (br_if $skip (i32.gt_u (i32.load (i32.const 13685052)) (i32.const 300)))
  (br_if $skip (i32.ne (local.get $pacePercent) (select (i32.load (i32.const 13685052)) (i32.const 100) (i32.gt_u (i32.load (i32.const 13685052)) (i32.const 100)))))
  (br_if $skip (i32.lt_u (local.get $pacePercent) (i32.const 100)))
  (br_if $skip (i32.gt_u (local.get $pacePercent) (i32.const 300)))
  (local.set $pace (f64.max (f64.const 1) (f64.div (f64.convert_i32_u (local.get $pacePercent)) (f64.const 100))))))
 (if (i32.ge_u (local.get $command) (i32.const 2)) (then
  (local.set $pacePercent (i32.load (i32.const 13685296)))
  (local.set $braking (i32.load (i32.const 13685292)))
  ;; Runtime adaptive pace can be reduced without replacing cached planning
  ;; caps. It may never exceed that selected ceiling or go below 0.75x.
  ;; All prior commands retain the exact matching-pace requirement.
  (if (i32.eq (local.get $command) (i32.const 3)) (then
   (br_if $skip (i32.lt_u (i32.load (i32.const 13685052)) (i32.const 75)))
   (br_if $skip (i32.gt_u (i32.load (i32.const 13685052)) (local.get $pacePercent)))) (else
   (br_if $skip (i32.ne (local.get $pacePercent) (i32.load (i32.const 13685052))))))
  (br_if $skip (i32.eqz (i32.and (i32.ge_u (local.get $pacePercent) (i32.const 75)) (i32.le_u (local.get $pacePercent) (i32.const 300)))))
  (br_if $skip (i32.eqz (i32.and (i32.ge_u (local.get $braking) (i32.const 50)) (i32.le_u (local.get $braking) (i32.const 100)))))
  (if (i32.eq (local.get $command) (i32.const 3)) (then
   (br_if $skip (i32.lt_u (local.get $pacePercent) (i32.const 100)))
   (br_if $skip (i32.gt_u (local.get $pacePercent) (i32.const 200)))))
  (local.set $pace (f64.max (f64.const 1) (f64.div (f64.convert_i32_u (local.get $pacePercent)) (f64.const 100))))))
 (local.set $grip (f64.promote_f32 (f32.load offset=4 (local.get $sp))))
 (local.set $curvature (f64.abs (f64.promote_f32 (f32.load offset=8 (local.get $sp)))))
 (local.set $cap (f64.promote_f32 (f32.load offset=12 (local.get $sp))))
 (br_if $skip (i32.eqz (i32.and (f64.gt (local.get $grip) (f64.const 0)) (f64.le (local.get $grip) (f64.const 20)))))
 (br_if $skip (i32.eqz (i32.and (f64.ge (local.get $curvature) (f64.const 0)) (f64.le (local.get $curvature) (f64.const 10)))))
 (br_if $skip (i32.eqz (i32.and (f64.gt (local.get $cap) (f64.const 0)) (f64.le (local.get $cap) (f64.const 150)))))
 (if (i32.and (i32.eqz (i32.load (i32.const 13685264))) (i32.eq (local.get $seq) (i32.load (i32.const 13684996)))) (then
 (f32.store (i32.const 13685276) (f32.min (f32.load (i32.const 13685276)) (f32.const -5)))))
 ;; A curve can become limiting only under increased custom pace. Clear straights
 ;; retain their original cap and selected post-route pace.
 (local.set $pacedCap (f64.mul (local.get $cap) (local.get $pace)))
 (if (i32.eq (local.get $command) (i32.const 3)) (then
  ;; Every valid sampled nonzero bend is eligible; exact straights stay native.
  (br_if $skip (f64.eq (local.get $curvature) (f64.const 0)))) (else
 (br_if $skip (f64.le (local.get $curvature)
  (f64.div (f64.mul (local.get $grip) (f64.promote_f32 (f32.load (i32.const 0x7a51b8)))) (f64.mul (local.get $pacedCap) (local.get $pacedCap)))))))
 (br_if $skip (i32.ne (local.get $seq) (i32.load (i32.const 13684996))))
 (if (i32.and (i32.eqz (i32.load (i32.const 13685264))) (i32.eq (local.get $seq) (i32.load (i32.const 13684996)))) (then
 (f32.store (i32.const 13685276) (f32.min (f32.load (i32.const 13685276)) (f32.const -6)))))
 (local.set $eligible (i32.const 1))
)
;; ORIGINAL FUNCTION BODY RUNS HERE

(block $skipAfter
 (br_if $skipAfter (i32.eqz (local.get $eligible)))
 (br_if $skipAfter (i32.ne (local.get $seq) (i32.load (i32.const 13684996))))
 (br_if $skipAfter (i32.ne (i32.load offset=32 (local.get $cpu)) (i32.const 0x4228bb)))
 (br_if $skipAfter (i32.ne (i32.load offset=16 (local.get $cpu)) (i32.add (local.get $sp) (i32.const 4))))
 (local.set $slot (i32.add (i32.add (local.get $cpu) (i32.const 72)) (i32.shl (i32.and (i32.load offset=136 (local.get $cpu)) (i32.const 7)) (i32.const 3))))
 (local.set $speed (f64.load (local.get $slot)))
 ;; Only reduce finite positive native results, never stop intent. Command3
 ;; accepts tiny x87 roundoff above C; all old command comparisons stay exact.
 (br_if $skipAfter (i32.eqz (i32.and (f64.gt (local.get $speed) (f64.const 0)) (f64.le (local.get $speed) (select (f64.mul (local.get $cap) (f64.const 1.000001)) (local.get $cap) (i32.eq (local.get $command) (i32.const 3)))))))
 (br_if $skipAfter (i32.and (i32.and (i32.eq (local.get $command) (i32.const 1)) (f64.le (local.get $pace) (f64.const 1))) (f64.ge (local.get $speed) (local.get $cap))))
 (local.set $curveSpeed (local.get $speed))
 (if (i32.or (i32.eq (local.get $command) (i32.const 3)) (f64.gt (local.get $pace) (f64.const 1))) (then
  (local.set $curveSpeed (f64.sqrt (f64.div (f64.mul (local.get $grip) (f64.promote_f32 (f32.load (i32.const 0x7a51b8)))) (local.get $curvature))))))
 (if (i32.eq (local.get $command) (i32.const 3)) (then
  ;; L=P*C, q=k*L^2/(g*9.8), W=L/sqrt(1+q/f^2).
  ;; Store W/P: continuous, below the straight ceiling and protected curve cap,
  ;; with no guessed route distance or rewrite of physical braking/steering.
  (local.set $severity (f64.div (f64.convert_i32_u (local.get $percent)) (f64.const 100)))
  (local.set $scaled (f64.div (local.get $cap) (f64.sqrt
   (f64.add (f64.const 1) (f64.div
    (f64.mul (local.get $curvature) (f64.mul (local.get $pacedCap) (local.get $pacedCap)))
    (f64.mul (f64.mul (local.get $grip) (f64.promote_f32 (f32.load (i32.const 0x7a51b8)))) (f64.mul (local.get $severity) (local.get $severity))))))))
 ) (else
 (local.set $scaled (f64.mul (local.get $curveSpeed) (f64.div (f64.convert_i32_u (local.get $percent)) (f64.const 100))))))
 ;; Native speed/cap is a dimensionless measure of curvature demand. Add more
 ;; margin to tighter bends without guessing route-node layouts or sampling
 ;; current steering. The original planner propagates this cap into braking.
 ;; A zero margin follows the exact v0.13 multiplication path.
 (if (local.get $margin) (then
  (local.set $severity (f64.max (f64.const 0) (f64.sub (f64.const 1) (f64.div (local.get $curveSpeed) (local.get $cap)))))
  (local.set $scaled (f64.mul (local.get $scaled)
   (f64.sub (f64.const 1) (f64.mul (f64.div (f64.convert_i32_u (local.get $margin)) (f64.const 100)) (local.get $severity)))))))
 ;; Compensate the selected pace that native target consumption applies later.
 (if (i32.ne (local.get $command) (i32.const 3)) (then (local.set $scaled (f64.div (local.get $scaled) (local.get $pace)))))
 (br_if $skipAfter (i32.eqz (i32.and (f64.gt (local.get $scaled) (f64.const 0)) (f64.lt (local.get $scaled) (local.get $speed)))))
 (f64.store (local.get $slot) (local.get $scaled))
 (i32.store (i32.const 13685260) (local.get $car))
 (i32.store (i32.const 13685264) (i32.add (i32.load (i32.const 13685264)) (i32.const 1)))
 (f32.store (i32.const 13685268) (f32.demote_f64 (local.get $speed)))
 (f32.store (i32.const 13685272) (f32.demote_f64 (local.get $scaled)))
 (f32.store (i32.const 13685276) (f32.demote_f64 (local.get $curvature)))
 (i32.store (i32.const 13685280) (local.get $percent))
 (i32.store (i32.const 13685288) (local.get $margin))
 (if (i32.ge_u (local.get $command) (i32.const 2)) (then (i32.store (i32.const 13685300) (local.get $pacePercent)) (i32.store (i32.const 13685304) (local.get $braking))))
)))