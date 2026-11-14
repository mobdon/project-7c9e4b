  (func $f22883 (type $t3) (param $p0 i32) (param $p1 i32) (result i32)
    (local $l2 i32) (local $l3 i32) (local $l4 i32) (local $l5 i32) (local $l6 i32)
    global.get $g0
    i32.const 2848
    i32.sub
    local.tee $l2
    global.set $g0
    i32.const 0
    local.set $l3
    block $B0
      local.get $p0
      i32.load offset=1441472
      br_if $B0
      local.get $p0
      i32.load offset=96
      local.tee $l4
      i32.eqz
      br_if $B0
      local.get $p0
      i64.load offset=1441560
      i64.eqz
      br_if $B0
      local.get $l2
      i32.const 8
      i32.add
      i32.const 0
      i32.const 1640
      memory.fill
      local.get $l2
      i32.const 22
      i32.store8 offset=9
      local.get $l2
      local.get $p0
      i32.load
      i32.store offset=12
      local.get $l2
      local.get $p0
      i32.load16_u offset=1438872
      i32.store16 offset=16
      local.get $l2
      local.get $p1
      v128.load align=4
      v128.store offset=20 align=4
      local.get $p0
      i32.load offset=1441396
      local.set $l3
      local.get $p0
      i32.load16_u offset=100
      local.set $l5
      block $B1
        local.get $l2
        i32.const 8
        i32.add
        local.get $l2
        i32.const 1648
        i32.add
        i32.const 1200
        call $f22860
        local.tee $p1
        i32.const 1
        i32.lt_s
        br_if $B1
        local.get $p0
        i32.load offset=140
        local.tee $l6
        i32.eqz
        br_if $B1
        local.get $p0
        i32.load offset=1441472
        br_if $B1
        local.get $p0
        i32.load offset=136
        local.get $l4
        local.get $l5
        i32.const 65535
        i32.and
        local.get $l2
        i32.const 1648
        i32.add
        local.get $p1
        local.get $l6
        call_indirect $T0 (type $t12)
        local.get $p0
        local.get $p0
        i32.load offset=1441396
        i32.const 1
        i32.add
        i32.store offset=1441396
        local.get $p0
        local.get $p0
        i32.load offset=1441400
        local.get $p1
        i32.add
        i32.store offset=1441400
      end
      local.get $p0
      i32.load offset=1441396
      local.get $l3
      i32.ne
      local.set $l3
    end
    local.get $l2
    i32.const 2848
    i32.add
    global.set $g0
    local.get $l3)
