  (func $f21270 (type $t5) (param $p0 i32) (param $p1 i32) (param $p2 i32)
    (local $l3 i32) (local $l4 i32) (local $l5 i32) (local $l6 i32) (local $l7 i32) (local $l8 i32) (local $l9 i32)
    global.get $g0
    i32.const 96
    i32.sub
    local.tee $l3
    global.set $g0
    local.get $p1
    i32.const 128
    i32.and
    local.set $l4
    local.get $p1
    i32.const 127
    i32.and
    local.set $l5
    block $B0
      i32.const 0
      i32.load offset=673985284
      i32.eqz
      br_if $B0
      block $B1
        local.get $p0
        i32.eqz
        br_if $B1
        i32.const 0
        i32.const 0
        i32.load offset=673985844
        i32.const 1
        i32.add
        i32.store offset=673985844
      end
      block $B2
        local.get $l4
        i32.eqz
        br_if $B2
        i32.const 0
        i32.const 0
        i32.load offset=673985852
        i32.const 1
        i32.add
        i32.store offset=673985852
      end
      i32.const 0
      i32.const 0
      i32.load8_u offset=673985856
      local.get $p1
      i32.or
      i32.store8 offset=673985856
      i32.const 0
      i32.load offset=672536788
      local.set $l6
      block $B3
        block $B4
          local.get $l5
          br_if $B4
          local.get $l6
          local.set $l7
          br $B3
        end
        i32.const 1
        local.set $l7
        i32.const 0
        i32.const 0
        i32.load offset=673985848
        local.tee $l8
        i32.const 1
        i32.add
        local.tee $l9
        i32.store offset=673985848
        local.get $l6
        i32.eqz
        br_if $B0
        block $B5
          local.get $l9
          i32.const 4
          i32.lt_u
          br_if $B5
          local.get $l9
          local.get $l8
          i32.and
          br_if $B3
        end
        call $f21197
        local.set $l6
        local.get $l3
        i32.const 80
        i32.add
        i32.const 0
        i32.load8_u offset=673985856
        i32.store
        local.get $l3
        local.get $l6
        i32.store offset=64
        local.get $l3
        local.get $p1
        i32.store offset=68
        local.get $l3
        i32.const 0
        i64.load offset=673985844 align=4
        i64.const 32
        i64.rotl
        i64.store offset=72
        i32.const 0
        i32.load offset=672535704
        i32.const 671390451
        local.get $l3
        i32.const 64
        i32.add
        call $f24508
        drop
        i32.const 0
        i32.load offset=672536788
        local.set $l7
      end
      local.get $l4
      i32.eqz
      br_if $B0
      local.get $l7
      i32.eqz
      br_if $B0
      block $B6
        i32.const 0
        i32.load offset=673985852
        local.tee $l6
        i32.const 4
        i32.lt_u
        br_if $B6
        local.get $l6
        i32.popcnt
        i32.const 1
        i32.gt_u
        br_if $B0
      end
      local.get $l3
      call $f21197
      i32.store offset=48
      local.get $l3
      i32.const 0
      i32.load offset=673985852
      i32.store offset=52
      local.get $l3
      i32.const 0
      i64.load offset=673985844 align=4
      i64.const 32
      i64.rotl
      i64.store offset=56
      i32.const 0
      i32.load offset=672535704
      i32.const 671512610
      local.get $l3
      i32.const 48
      i32.add
      call $f24508
      drop
    end
    block $B7
      i32.const 0
      i32.load offset=673985288
      i32.eqz
      br_if $B7
      block $B8
        local.get $p0
        i32.eqz
        br_if $B8
        i32.const 0
        i32.const 0
        i32.load offset=673985860
        i32.const 1
        i32.add
        i32.store offset=673985860
      end
      block $B9
        local.get $l4
        i32.eqz
        br_if $B9
        i32.const 0
        i32.const 0
        i32.load offset=673985868
        i32.const 1
        i32.add
        i32.store offset=673985868
      end
      i32.const 0
      i32.const 0
      i32.load8_u offset=673985872
      local.get $p1
      i32.or
      i32.store8 offset=673985872
      i32.const 0
      i32.load offset=672536788
      local.set $p0
      block $B10
        block $B11
          local.get $l5
          br_if $B11
          local.get $p0
          local.set $l5
          br $B10
        end
        i32.const 1
        local.set $l5
        i32.const 0
        i32.const 0
        i32.load offset=673985864
        i32.const 1
        i32.add
        local.tee $l6
        i32.store offset=673985864
        local.get $p0
        i32.eqz
        br_if $B7
        i32.const 0
        i32.const 0
        i32.load offset=673985876
        i32.const 1
        i32.add
        local.tee $p0
        i32.store offset=673985876
        block $B12
          local.get $p0
          i32.const 65
          i32.lt_u
          br_if $B12
          local.get $l6
          i32.popcnt
          i32.const 1
          i32.gt_u
          br_if $B10
        end
        call $f21197
        local.set $p0
        local.get $l3
        i32.const 36
        i32.add
        i32.const 0
        i32.load8_u offset=673985872
        i32.store
        local.get $l3
        local.get $p0
        i32.store offset=16
        local.get $l3
        local.get $p1
        i32.store offset=20
        local.get $l3
        local.get $p2
        i32.store offset=24
        local.get $l3
        i32.const 0
        i64.load offset=673985860 align=4
        i64.const 32
        i64.rotl
        i64.store offset=28 align=4
        i32.const 0
        i32.load offset=672535704
        i32.const 671390557
        local.get $l3
        i32.const 16
        i32.add
        call $f24508
        drop
        i32.const 0
        i32.load offset=672536788
        local.set $l5
      end
      local.get $l4
      i32.eqz
      br_if $B7
      local.get $l5
      i32.eqz
      br_if $B7
      block $B13
        i32.const 0
        i32.load offset=673985868
        local.tee $p1
        i32.const 4
        i32.lt_u
        br_if $B13
        local.get $p1
        i32.popcnt
        i32.const 1
        i32.gt_u
        br_if $B7
      end
      local.get $l3
      call $f21197
      i32.store
      local.get $l3
      i32.const 0
      i32.load offset=673985868
      i32.store offset=4
      local.get $l3
      i32.const 0
      i64.load offset=673985860 align=4
      i64.const 32
      i64.rotl
      i64.store offset=8
      i32.const 0
      i32.load offset=672535704
      i32.const 671512698
      local.get $l3
      call $f24508
      drop
    end
    local.get $l3
    i32.const 96
    i32.add
    global.set $g0)
