  (func $f22861 (type $t4) (param $p0 i32) (result i32)
    (local $l1 i32) (local $l2 f32) (local $l3 i32)
    block $B0
      block $B1
        local.get $p0
        i32.load
        i32.eqz
        br_if $B1
        local.get $p0
        i32.load offset=4
        i32.eqz
        br_if $B1
        local.get $p0
        i32.load8_u offset=13
        local.tee $l1
        i32.const -7
        i32.add
        i32.const 255
        i32.and
        i32.const 250
        i32.lt_u
        br_if $B1
        local.get $p0
        i32.load8_u offset=12
        local.get $l1
        i32.const 255
        i32.and
        i32.gt_u
        br_if $B1
        local.get $p0
        i32.load8_u offset=16
        i32.const -4
        i32.add
        i32.const 255
        i32.and
        i32.const 251
        i32.lt_u
        br_if $B1
        local.get $p0
        i32.load8_u offset=14
        i32.const 7
        i32.gt_u
        br_if $B1
        local.get $p0
        i32.load8_u offset=17
        i32.const 2
        i32.gt_u
        br_if $B1
        local.get $p0
        i32.load8_u offset=18
        i32.const 9
        i32.gt_u
        br_if $B1
        local.get $p0
        i32.load8_u offset=19
        i32.const 7
        i32.gt_u
        br_if $B1
        local.get $p0
        f32.load offset=20
        local.tee $l2
        i32.reinterpret_f32
        local.tee $l1
        i32.const 2147483647
        i32.and
        local.tee $l3
        i32.eqz
        local.get $l1
        i32.const -1
        i32.add
        i32.const 8388607
        i32.lt_u
        i32.or
        local.get $l3
        i32.const -8388608
        i32.add
        i32.const 2130706432
        i32.lt_u
        local.get $l1
        i32.const -1
        i32.gt_s
        i32.and
        i32.or
        i32.const 1
        i32.ne
        br_if $B1
        local.get $l2
        f32.const 0x1.388p+12 (;=5000;)
        f32.le
        i32.eqz
        br_if $B1
        local.get $p0
        f32.load offset=24
        local.tee $l2
        i32.reinterpret_f32
        local.tee $l1
        i32.const 2147483647
        i32.and
        local.tee $l3
        i32.eqz
        local.get $l1
        i32.const -1
        i32.add
        i32.const 8388607
        i32.lt_u
        i32.or
        local.get $l3
        i32.const -8388608
        i32.add
        i32.const 2130706432
        i32.lt_u
        local.get $l1
        i32.const -1
        i32.gt_s
        i32.and
        i32.or
        i32.const 1
        i32.ne
        br_if $B1
        local.get $l2
        f32.const 0x1.388p+12 (;=5000;)
        f32.le
        i32.eqz
        br_if $B1
        local.get $p0
        f32.load offset=28
        local.tee $l2
        i32.reinterpret_f32
        i32.const 1
        i32.shl
        i32.const -16777217
        i32.gt_u
        br_if $B1
        local.get $l2
        f32.const 0x1.47ae14p-7 (;=0.01;)
        f32.ge
        i32.eqz
        br_if $B1
        local.get $l2
        f32.const 0x1.9p+6 (;=100;)
        f32.le
        i32.eqz
        br_if $B1
        local.get $p0
        f32.load offset=32
        local.tee $l2
        i32.reinterpret_f32
        local.tee $l1
        i32.const 2147483647
        i32.and
        local.tee $l3
        i32.eqz
        local.get $l1
        i32.const -1
        i32.add
        i32.const 8388607
        i32.lt_u
        i32.or
        local.get $l3
        i32.const -8388608
        i32.add
        i32.const 2130706432
        i32.lt_u
        local.get $l1
        i32.const -1
        i32.gt_s
        i32.and
        i32.or
        i32.const 1
        i32.ne
        br_if $B1
        local.get $l2
        f32.const 0x1.388p+13 (;=10000;)
        f32.le
        i32.eqz
        br_if $B1
        local.get $p0
        f32.load offset=36
        local.tee $l2
        i32.reinterpret_f32
        local.tee $l1
        i32.const 2147483647
        i32.and
        local.tee $l3
        i32.eqz
        local.get $l1
        i32.const -1
        i32.add
        i32.const 8388607
        i32.lt_u
        i32.or
        local.get $l3
        i32.const -8388608
        i32.add
        i32.const 2130706432
        i32.lt_u
        local.get $l1
        i32.const -1
        i32.gt_s
        i32.and
        i32.or
        i32.const 1
        i32.ne
        br_if $B1
        local.get $l2
        f32.const 0x1.86ap+15 (;=50000;)
        f32.le
        i32.eqz
        br_if $B1
        local.get $p0
        f32.load offset=40
        local.tee $l2
        i32.reinterpret_f32
        local.tee $l1
        i32.const 2147483647
        i32.and
        local.tee $l3
        i32.eqz
        local.get $l1
        i32.const -1
        i32.add
        i32.const 8388607
        i32.lt_u
        i32.or
        local.get $l3
        i32.const -8388608
        i32.add
        i32.const 2130706432
        i32.lt_u
        local.get $l1
        i32.const -1
        i32.gt_s
        i32.and
        i32.or
        i32.const 1
        i32.ne
        br_if $B1
        local.get $l2
        f32.const 0x1.f4p+10 (;=2000;)
        f32.le
        i32.eqz
        br_if $B1
        local.get $p0
        f32.load offset=44
        local.tee $l2
        i32.reinterpret_f32
        local.tee $l1
        i32.const 2147483647
        i32.and
        local.tee $l3
        i32.eqz
        local.get $l1
        i32.const -1
        i32.add
        i32.const 8388607
        i32.lt_u
        i32.or
        local.get $l3
        i32.const -8388608
        i32.add
        i32.const 2130706432
        i32.lt_u
        local.get $l1
        i32.const -1
        i32.gt_s
        i32.and
        i32.or
        i32.const 1
        i32.ne
        br_if $B1
        local.get $l2
        f32.const 0x1.86ap+16 (;=100000;)
        f32.le
        i32.eqz
        br_if $B1
        block $B2
          local.get $p0
          i32.load8_u offset=48
          br_if $B2
          i32.const 1
          return
        end
        block $B3
          block $B4
            local.get $p0
            i32.load8_u offset=49
            br_if $B4
            i32.const 1
            local.set $l3
            br $B3
          end
          block $B5
            local.get $p0
            i32.load8_u offset=50
            br_if $B5
            i32.const 2
            local.set $l3
            br $B3
          end
          block $B6
            local.get $p0
            i32.load8_u offset=51
            br_if $B6
            i32.const 3
            local.set $l3
            br $B3
          end
          block $B7
            local.get $p0
            i32.load8_u offset=52
            br_if $B7
            i32.const 4
            local.set $l3
            br $B3
          end
          block $B8
            local.get $p0
            i32.load8_u offset=53
            br_if $B8
            i32.const 5
            local.set $l3
            br $B3
          end
          block $B9
            local.get $p0
            i32.load8_u offset=54
            br_if $B9
            i32.const 6
            local.set $l3
            br $B3
          end
          block $B10
            local.get $p0
            i32.load8_u offset=55
            br_if $B10
            i32.const 7
            local.set $l3
            br $B3
          end
          block $B11
            local.get $p0
            i32.load8_u offset=56
            br_if $B11
            i32.const 8
            local.set $l3
            br $B3
          end
          block $B12
            local.get $p0
            i32.load8_u offset=57
            br_if $B12
            i32.const 9
            local.set $l3
            br $B3
          end
          block $B13
            local.get $p0
            i32.load8_u offset=58
            br_if $B13
            i32.const 10
            local.set $l3
            br $B3
          end
          block $B14
            local.get $p0
            i32.load8_u offset=59
            br_if $B14
            i32.const 11
            local.set $l3
            br $B3
          end
          block $B15
            local.get $p0
            i32.load8_u offset=60
            br_if $B15
            i32.const 12
            local.set $l3
            br $B3
          end
          block $B16
            local.get $p0
            i32.load8_u offset=61
            br_if $B16
            i32.const 13
            local.set $l3
            br $B3
          end
          block $B17
            local.get $p0
            i32.load8_u offset=62
            br_if $B17
            i32.const 14
            local.set $l3
            br $B3
          end
          i32.const 16
          i32.const 15
          local.get $p0
          i32.load8_u offset=63
          select
          local.set $l3
        end
        local.get $p0
        i32.const 48
        i32.add
        local.set $l1
        loop $L18
          local.get $l1
          i32.load8_u
          i32.const -127
          i32.add
          i32.const 255
          i32.and
          i32.const 160
          i32.le_u
          br_if $B1
          i32.const 1
          local.set $p0
          local.get $l1
          i32.const 1
          i32.add
          local.set $l1
          local.get $l3
          i32.const -1
          i32.add
          local.tee $l3
          i32.eqz
          br_if $B0
          br $L18
        end
      end
      i32.const 0
      local.set $p0
    end
    local.get $p0)
