  (func $f22855 (type $t9) (param $p0 i32) (param $p1 i32)
    (local $l2 i32) (local $l3 i32) (local $l4 i32) (local $l5 f32) (local $l6 f32) (local $l7 i32) (local $l8 i32) (local $l9 i32) (local $l10 i32)
    block $B0
      local.get $p1
      i32.load8_u offset=78
      br_if $B0
      block $B1
        block $B2
          local.get $p0
          i32.load offset=12
          br_if $B2
          local.get $p0
          i32.load offset=8
          local.get $p0
          i32.load offset=4
          local.tee $l2
          i32.ne
          br_if $B1
        end
        local.get $p0
        i32.const 1
        i32.store offset=12
        return
      end
      local.get $p0
      local.get $l2
      i32.const 1
      i32.add
      i32.store offset=4
      local.get $p0
      i32.load
      local.get $l2
      i32.add
      i32.const 0
      i32.store8
      return
    end
    i32.const 1
    local.set $l3
    block $B3
      local.get $p1
      i32.load8_u offset=141
      i32.const 15
      i32.and
      br_if $B3
      local.get $p1
      i32.load8_u offset=142
      i32.const 0
      i32.ne
      local.set $l3
    end
    i32.const 0
    local.set $l2
    i32.const 0
    local.set $l4
    block $B4
      f32.const -0x1.f4p+10 (;=-2000;)
      f32.const 0x1.f4p+9 (;=1000;)
      local.get $p1
      f32.load offset=100
      local.tee $l5
      local.get $l5
      f32.const 0x1.f4p+9 (;=1000;)
      f32.gt
      select
      local.tee $l6
      local.get $l6
      f32.add
      local.get $l5
      f32.const -0x1.f4p+9 (;=-1000;)
      f32.lt
      select
      local.tee $l5
      local.get $l5
      f32.ne
      br_if $B4
      i32.const 1
      local.set $l4
      local.get $l5
      f32.abs
      f32.const 0x1.fffffep+30 (;=2.14748e+09;)
      f32.ge
      br_if $B4
      local.get $l5
      f32.const 0x1p-1 (;=0.5;)
      f32.const -0x1p-1 (;=-0.5;)
      local.get $l5
      f32.const 0x0p+0 (;=0;)
      f32.ge
      select
      f32.add
      i32.trunc_sat_f32_s
      i32.const 0
      i32.ne
      local.set $l4
    end
    block $B5
      f32.const -0x1.f4p+10 (;=-2000;)
      f32.const 0x1.f4p+9 (;=1000;)
      local.get $p1
      f32.load offset=104
      local.tee $l5
      local.get $l5
      f32.const 0x1.f4p+9 (;=1000;)
      f32.gt
      select
      local.tee $l6
      local.get $l6
      f32.add
      local.get $l5
      f32.const -0x1.f4p+9 (;=-1000;)
      f32.lt
      select
      local.tee $l5
      local.get $l5
      f32.ne
      br_if $B5
      i32.const 1
      local.set $l2
      local.get $l5
      f32.abs
      f32.const 0x1.fffffep+30 (;=2.14748e+09;)
      f32.ge
      br_if $B5
      local.get $l5
      f32.const 0x1p-1 (;=0.5;)
      f32.const -0x1p-1 (;=-0.5;)
      local.get $l5
      f32.const 0x0p+0 (;=0;)
      f32.ge
      select
      f32.add
      i32.trunc_sat_f32_s
      i32.const 0
      i32.ne
      local.set $l2
    end
    local.get $l2
    local.get $l4
    i32.or
    local.set $l7
    i32.const 0
    local.set $l2
    i32.const 0
    local.set $l4
    block $B6
      f32.const -0x1.f4p+10 (;=-2000;)
      f32.const 0x1.f4p+9 (;=1000;)
      local.get $p1
      f32.load offset=108
      local.tee $l5
      local.get $l5
      f32.const 0x1.f4p+9 (;=1000;)
      f32.gt
      select
      local.tee $l6
      local.get $l6
      f32.add
      local.get $l5
      f32.const -0x1.f4p+9 (;=-1000;)
      f32.lt
      select
      local.tee $l5
      local.get $l5
      f32.ne
      br_if $B6
      i32.const 1
      local.set $l4
      local.get $l5
      f32.abs
      f32.const 0x1.fffffep+30 (;=2.14748e+09;)
      f32.ge
      br_if $B6
      local.get $l5
      f32.const 0x1p-1 (;=0.5;)
      f32.const -0x1p-1 (;=-0.5;)
      local.get $l5
      f32.const 0x0p+0 (;=0;)
      f32.ge
      select
      f32.add
      i32.trunc_sat_f32_s
      i32.const 0
      i32.ne
      local.set $l4
    end
    local.get $l4
    local.get $l7
    i32.or
    local.set $l4
    block $B7
      f32.const -0x1.f4p+10 (;=-2000;)
      f32.const 0x1.f4p+9 (;=1000;)
      local.get $p1
      f32.load offset=112
      local.tee $l5
      local.get $l5
      f32.const 0x1.f4p+9 (;=1000;)
      f32.gt
      select
      local.tee $l6
      local.get $l6
      f32.add
      local.get $l5
      f32.const -0x1.f4p+9 (;=-1000;)
      f32.lt
      select
      local.tee $l5
      local.get $l5
      f32.ne
      br_if $B7
      i32.const 1
      local.set $l2
      local.get $l5
      f32.abs
      f32.const 0x1.fffffep+30 (;=2.14748e+09;)
      f32.ge
      br_if $B7
      local.get $l5
      f32.const 0x1p-1 (;=0.5;)
      f32.const -0x1p-1 (;=-0.5;)
      local.get $l5
      f32.const 0x0p+0 (;=0;)
      f32.ge
      select
      f32.add
      i32.trunc_sat_f32_s
      i32.const 0
      i32.ne
      local.set $l2
    end
    local.get $l2
    local.get $l4
    i32.or
    local.set $l7
    i32.const 0
    local.set $l2
    i32.const 0
    local.set $l4
    block $B8
      f32.const -0x1.f4p+10 (;=-2000;)
      f32.const 0x1.f4p+9 (;=1000;)
      local.get $p1
      f32.load offset=116
      local.tee $l5
      local.get $l5
      f32.const 0x1.f4p+9 (;=1000;)
      f32.gt
      select
      local.tee $l6
      local.get $l6
      f32.add
      local.get $l5
      f32.const -0x1.f4p+9 (;=-1000;)
      f32.lt
      select
      local.tee $l5
      local.get $l5
      f32.ne
      br_if $B8
      i32.const 1
      local.set $l4
      local.get $l5
      f32.abs
      f32.const 0x1.fffffep+30 (;=2.14748e+09;)
      f32.ge
      br_if $B8
      local.get $l5
      f32.const 0x1p-1 (;=0.5;)
      f32.const -0x1p-1 (;=-0.5;)
      local.get $l5
      f32.const 0x0p+0 (;=0;)
      f32.ge
      select
      f32.add
      i32.trunc_sat_f32_s
      i32.const 0
      i32.ne
      local.set $l4
    end
    local.get $l4
    local.get $l7
    i32.or
    local.set $l4
    block $B9
      f32.const -0x1.f4p+10 (;=-2000;)
      f32.const 0x1.f4p+9 (;=1000;)
      local.get $p1
      f32.load offset=120
      local.tee $l5
      local.get $l5
      f32.const 0x1.f4p+9 (;=1000;)
      f32.gt
      select
      local.tee $l6
      local.get $l6
      f32.add
      local.get $l5
      f32.const -0x1.f4p+9 (;=-1000;)
      f32.lt
      select
      local.tee $l5
      local.get $l5
      f32.ne
      br_if $B9
      i32.const 1
      local.set $l2
      local.get $l5
      f32.abs
      f32.const 0x1.fffffep+30 (;=2.14748e+09;)
      f32.ge
      br_if $B9
      local.get $l5
      f32.const 0x1p-1 (;=0.5;)
      f32.const -0x1p-1 (;=-0.5;)
      local.get $l5
      f32.const 0x0p+0 (;=0;)
      f32.ge
      select
      f32.add
      i32.trunc_sat_f32_s
      i32.const 0
      i32.ne
      local.set $l2
    end
    local.get $l2
    local.get $l4
    i32.or
    local.set $l7
    i32.const 0
    local.set $l2
    i32.const 0
    local.set $l4
    block $B10
      f32.const -0x1.f4p+10 (;=-2000;)
      f32.const 0x1.f4p+9 (;=1000;)
      local.get $p1
      f32.load offset=124
      local.tee $l5
      local.get $l5
      f32.const 0x1.f4p+9 (;=1000;)
      f32.gt
      select
      local.tee $l6
      local.get $l6
      f32.add
      local.get $l5
      f32.const -0x1.f4p+9 (;=-1000;)
      f32.lt
      select
      local.tee $l5
      local.get $l5
      f32.ne
      br_if $B10
      i32.const 1
      local.set $l4
      local.get $l5
      f32.abs
      f32.const 0x1.fffffep+30 (;=2.14748e+09;)
      f32.ge
      br_if $B10
      local.get $l5
      f32.const 0x1p-1 (;=0.5;)
      f32.const -0x1p-1 (;=-0.5;)
      local.get $l5
      f32.const 0x0p+0 (;=0;)
      f32.ge
      select
      f32.add
      i32.trunc_sat_f32_s
      i32.const 0
      i32.ne
      local.set $l4
    end
    local.get $p1
    i32.load16_u offset=136
    local.set $l8
    local.get $l4
    local.get $l7
    i32.or
    local.set $l4
    block $B11
      f32.const -0x1.f4p+10 (;=-2000;)
      f32.const 0x1.f4p+9 (;=1000;)
      local.get $p1
      f32.load offset=128
      local.tee $l5
      local.get $l5
      f32.const 0x1.f4p+9 (;=1000;)
      f32.gt
      select
      local.tee $l6
      local.get $l6
      f32.add
      local.get $l5
      f32.const -0x1.f4p+9 (;=-1000;)
      f32.lt
      select
      local.tee $l5
      local.get $l5
      f32.ne
      br_if $B11
      i32.const 1
      local.set $l2
      local.get $l5
      f32.abs
      f32.const 0x1.fffffep+30 (;=2.14748e+09;)
      f32.ge
      br_if $B11
      local.get $l5
      f32.const 0x1p-1 (;=0.5;)
      f32.const -0x1p-1 (;=-0.5;)
      local.get $l5
      f32.const 0x0p+0 (;=0;)
      f32.ge
      select
      f32.add
      i32.trunc_sat_f32_s
      i32.const 0
      i32.ne
      local.set $l2
    end
    local.get $l3
    local.get $l8
    i32.const 65535
    i32.and
    i32.const 0
    i32.ne
    i32.or
    local.set $l9
    local.get $l3
    local.get $l2
    local.get $l4
    i32.or
    i32.const 0
    i32.ne
    i32.or
    local.set $l2
    block $B12
      block $B13
        block $B14
          local.get $p0
          i32.load offset=12
          br_if $B14
          local.get $p0
          i32.load offset=8
          local.get $p0
          i32.load offset=4
          local.tee $l4
          i32.ne
          br_if $B13
        end
        local.get $p0
        i32.const 1
        i32.store offset=12
        br $B12
      end
      local.get $p0
      local.get $l4
      i32.const 1
      i32.add
      i32.store offset=4
      local.get $p0
      i32.load
      local.get $l4
      i32.add
      i32.const 5
      i32.const 0
      local.get $l9
      select
      local.get $l3
      i32.const 1
      i32.xor
      i32.sub
      i32.const 24
      i32.const 12
      local.get $l2
      select
      i32.add
      i32.store8
    end
    block $B15
      block $B16
        f32.const -0x1.f4p+14 (;=-32000;)
        f32.const 0x1p+5 (;=32;)
        local.get $p1
        f32.load offset=80
        local.tee $l5
        local.get $l5
        f32.const 0x1p+5 (;=32;)
        f32.gt
        select
        f32.const 0x1.f4p+9 (;=1000;)
        f32.mul
        local.get $l5
        f32.const -0x1p+5 (;=-32;)
        f32.lt
        select
        local.tee $l5
        local.get $l5
        f32.eq
        br_if $B16
        i32.const 0
        local.set $l4
        br $B15
      end
      block $B17
        local.get $l5
        f32.const 0x1.fffffep+30 (;=2.14748e+09;)
        f32.ge
        i32.eqz
        br_if $B17
        i32.const 32767
        local.set $l4
        br $B15
      end
      block $B18
        local.get $l5
        f32.const -0x1.fffffep+30 (;=-2.14748e+09;)
        f32.le
        i32.eqz
        br_if $B18
        i32.const 32769
        local.set $l4
        br $B15
      end
      local.get $l5
      f32.const 0x1p-1 (;=0.5;)
      f32.const -0x1p-1 (;=-0.5;)
      local.get $l5
      f32.const 0x0p+0 (;=0;)
      f32.ge
      select
      f32.add
      i32.trunc_sat_f32_s
      local.tee $l4
      i32.const -32767
      local.get $l4
      i32.const -32767
      i32.gt_s
      select
      local.tee $l4
      i32.const 32767
      local.get $l4
      i32.const 32767
      i32.lt_s
      select
      local.set $l4
    end
    block $B19
      block $B20
        block $B21
          local.get $p0
          i32.load offset=12
          br_if $B21
          local.get $p0
          i32.load offset=8
          local.get $p0
          i32.load offset=4
          local.tee $l7
          i32.sub
          i32.const 1
          i32.gt_u
          br_if $B20
        end
        local.get $p0
        i32.const 1
        i32.store offset=12
        br $B19
      end
      local.get $p0
      i32.load
      local.get $l7
      i32.add
      local.get $l4
      i32.store8
      local.get $p0
      i32.load
      local.get $p0
      i32.load offset=4
      i32.add
      i32.const 1
      i32.add
      local.get $l4
      i32.const 8
      i32.shr_u
      i32.store8
      local.get $p0
      local.get $p0
      i32.load offset=4
      i32.const 2
      i32.add
      i32.store offset=4
    end
    block $B22
      block $B23
        f32.const -0x1.f4p+14 (;=-32000;)
        f32.const 0x1p+5 (;=32;)
        local.get $p1
        f32.load offset=84
        local.tee $l5
        local.get $l5
        f32.const 0x1p+5 (;=32;)
        f32.gt
        select
        f32.const 0x1.f4p+9 (;=1000;)
        f32.mul
        local.get $l5
        f32.const -0x1p+5 (;=-32;)
        f32.lt
        select
        local.tee $l5
        local.get $l5
        f32.eq
        br_if $B23
        i32.const 0
        local.set $l4
        br $B22
      end
      block $B24
        local.get $l5
        f32.const 0x1.fffffep+30 (;=2.14748e+09;)
        f32.ge
        i32.eqz
        br_if $B24
        i32.const 32767
        local.set $l4
        br $B22
      end
      block $B25
        local.get $l5
        f32.const -0x1.fffffep+30 (;=-2.14748e+09;)
        f32.le
        i32.eqz
        br_if $B25
        i32.const 32769
        local.set $l4
        br $B22
      end
      local.get $l5
      f32.const 0x1p-1 (;=0.5;)
      f32.const -0x1p-1 (;=-0.5;)
      local.get $l5
      f32.const 0x0p+0 (;=0;)
      f32.ge
      select
      f32.add
      i32.trunc_sat_f32_s
      local.tee $l4
      i32.const -32767
      local.get $l4
      i32.const -32767
      i32.gt_s
      select
      local.tee $l4
      i32.const 32767
      local.get $l4
      i32.const 32767
      i32.lt_s
      select
      local.set $l4
    end
    block $B26
      block $B27
        local.get $p0
        i32.load offset=12
        br_if $B27
        local.get $p0
        i32.load offset=8
        local.get $p0
        i32.load offset=4
        local.tee $l7
        i32.sub
        i32.const 2
        i32.lt_u
        br_if $B27
        local.get $p0
        i32.load
        local.get $l7
        i32.add
        local.get $l4
        i32.store8
        local.get $p0
        i32.load
        local.get $p0
        i32.load offset=4
        i32.add
        i32.const 1
        i32.add
        local.get $l4
        i32.const 8
        i32.shr_u
        i32.store8
        local.get $p0
        local.get $p0
        i32.load offset=4
        i32.const 2
        i32.add
        i32.store offset=4
        br $B26
      end
      local.get $p0
      i32.const 1
      i32.store offset=12
    end
    block $B28
      block $B29
        f32.const -0x1.f4p+14 (;=-32000;)
        f32.const 0x1p+5 (;=32;)
        local.get $p1
        f32.load offset=88
        local.tee $l5
        local.get $l5
        f32.const 0x1p+5 (;=32;)
        f32.gt
        select
        f32.const 0x1.f4p+9 (;=1000;)
        f32.mul
        local.get $l5
        f32.const -0x1p+5 (;=-32;)
        f32.lt
        select
        local.tee $l5
        local.get $l5
        f32.eq
        br_if $B29
        i32.const 0
        local.set $l4
        br $B28
      end
      block $B30
        local.get $l5
        f32.const 0x1.fffffep+30 (;=2.14748e+09;)
        f32.ge
        i32.eqz
        br_if $B30
        i32.const 32767
        local.set $l4
        br $B28
      end
      block $B31
        local.get $l5
        f32.const -0x1.fffffep+30 (;=-2.14748e+09;)
        f32.le
        i32.eqz
        br_if $B31
        i32.const 32769
        local.set $l4
        br $B28
      end
      local.get $l5
      f32.const 0x1p-1 (;=0.5;)
      f32.const -0x1p-1 (;=-0.5;)
      local.get $l5
      f32.const 0x0p+0 (;=0;)
      f32.ge
      select
      f32.add
      i32.trunc_sat_f32_s
      local.tee $l4
      i32.const -32767
      local.get $l4
      i32.const -32767
      i32.gt_s
      select
      local.tee $l4
      i32.const 32767
      local.get $l4
      i32.const 32767
      i32.lt_s
      select
      local.set $l4
    end
    block $B32
      block $B33
        local.get $p0
        i32.load offset=12
        br_if $B33
        local.get $p0
        i32.load offset=8
        local.get $p0
        i32.load offset=4
        local.tee $l7
        i32.sub
        i32.const 2
        i32.lt_u
        br_if $B33
        local.get $p0
        i32.load
        local.get $l7
        i32.add
        local.get $l4
        i32.store8
        local.get $p0
        i32.load
        local.get $p0
        i32.load offset=4
        i32.add
        i32.const 1
        i32.add
        local.get $l4
        i32.const 8
        i32.shr_u
        i32.store8
        local.get $p0
        local.get $p0
        i32.load offset=4
        i32.const 2
        i32.add
        i32.store offset=4
        br $B32
      end
      local.get $p0
      i32.const 1
      i32.store offset=12
    end
    block $B34
      block $B35
        f32.const -0x1.f4p+14 (;=-32000;)
        f32.const 0x1p+5 (;=32;)
        local.get $p1
        f32.load offset=92
        local.tee $l5
        local.get $l5
        f32.const 0x1p+5 (;=32;)
        f32.gt
        select
        f32.const 0x1.f4p+9 (;=1000;)
        f32.mul
        local.get $l5
        f32.const -0x1p+5 (;=-32;)
        f32.lt
        select
        local.tee $l5
        local.get $l5
        f32.eq
        br_if $B35
        i32.const 0
        local.set $l4
        br $B34
      end
      block $B36
        local.get $l5
        f32.const 0x1.fffffep+30 (;=2.14748e+09;)
        f32.ge
        i32.eqz
        br_if $B36
        i32.const 32767
        local.set $l4
        br $B34
      end
      block $B37
        local.get $l5
        f32.const -0x1.fffffep+30 (;=-2.14748e+09;)
        f32.le
        i32.eqz
        br_if $B37
        i32.const 32769
        local.set $l4
        br $B34
      end
      local.get $l5
      f32.const 0x1p-1 (;=0.5;)
      f32.const -0x1p-1 (;=-0.5;)
      local.get $l5
      f32.const 0x0p+0 (;=0;)
      f32.ge
      select
      f32.add
      i32.trunc_sat_f32_s
      local.tee $l4
      i32.const -32767
      local.get $l4
      i32.const -32767
      i32.gt_s
      select
      local.tee $l4
      i32.const 32767
      local.get $l4
      i32.const 32767
      i32.lt_s
      select
      local.set $l4
    end
    block $B38
      block $B39
        block $B40
          local.get $p0
          i32.load offset=12
          br_if $B40
          local.get $p0
          i32.load offset=8
          local.get $p0
          i32.load offset=4
          local.tee $l7
          i32.sub
          i32.const 2
          i32.lt_u
          br_if $B40
          local.get $p0
          i32.load
          local.get $l7
          i32.add
          local.get $l4
          i32.store8
          local.get $p0
          i32.load
          local.get $p0
          i32.load offset=4
          i32.add
          i32.const 1
          i32.add
          local.get $l4
          i32.const 8
          i32.shr_u
          i32.store8
          local.get $p0
          local.get $p0
          i32.load offset=4
          i32.const 2
          i32.add
          i32.store offset=4
          local.get $p0
          i32.load offset=12
          br_if $B40
          local.get $p0
          i32.load offset=8
          local.get $p0
          i32.load offset=4
          local.tee $l4
          i32.eq
          br_if $B40
          local.get $p1
          i32.load8_u offset=96
          local.set $l7
          local.get $p0
          local.get $l4
          i32.const 1
          i32.add
          i32.store offset=4
          local.get $p0
          i32.load
          local.get $l4
          i32.add
          local.get $l7
          i32.store8
          local.get $p0
          i32.load offset=12
          br_if $B40
          local.get $p0
          i32.load offset=8
          local.get $p0
          i32.load offset=4
          local.tee $l4
          i32.eq
          br_if $B40
          local.get $p1
          i32.load8_u offset=97
          local.set $l7
          local.get $p0
          local.get $l4
          i32.const 1
          i32.add
          i32.store offset=4
          local.get $p0
          i32.load
          local.get $l4
          i32.add
          local.get $l7
          i32.store8
          local.get $p0
          i32.load offset=12
          br_if $B40
          local.get $p0
          i32.load offset=8
          local.get $p0
          i32.load offset=4
          local.tee $l4
          i32.ne
          br_if $B39
        end
        local.get $p0
        i32.const 1
        i32.store offset=12
        br $B38
      end
      local.get $p1
      i32.load8_u offset=98
      local.set $l7
      local.get $p0
      local.get $l4
      i32.const 1
      i32.add
      i32.store offset=4
      local.get $p0
      i32.load
      local.get $l4
      i32.add
      local.get $l7
      i32.store8
    end
    block $B41
      local.get $l2
      i32.eqz
      br_if $B41
      local.get $p1
      i32.const 132
      i32.add
      local.set $l7
      i32.const 0
      local.set $l2
      loop $L42
        i32.const 0
        local.set $l4
        block $B43
          f32.const -0x1.f4p+10 (;=-2000;)
          f32.const 0x1.f4p+9 (;=1000;)
          local.get $p1
          local.get $l2
          i32.add
          local.tee $l8
          i32.const 100
          i32.add
          f32.load
          local.tee $l5
          local.get $l5
          f32.const 0x1.f4p+9 (;=1000;)
          f32.gt
          select
          local.tee $l6
          local.get $l6
          f32.add
          local.get $l5
          f32.const -0x1.f4p+9 (;=-1000;)
          f32.lt
          select
          local.tee $l5
          local.get $l5
          f32.ne
          br_if $B43
          block $B44
            local.get $l5
            f32.const 0x1.fffffep+30 (;=2.14748e+09;)
            f32.ge
            i32.eqz
            br_if $B44
            i32.const 127
            local.set $l4
            br $B43
          end
          block $B45
            local.get $l5
            f32.const -0x1.fffffep+30 (;=-2.14748e+09;)
            f32.le
            i32.eqz
            br_if $B45
            i32.const 129
            local.set $l4
            br $B43
          end
          local.get $l5
          f32.const 0x1p-1 (;=0.5;)
          f32.const -0x1p-1 (;=-0.5;)
          local.get $l5
          f32.const 0x0p+0 (;=0;)
          f32.ge
          select
          f32.add
          i32.trunc_sat_f32_s
          local.tee $l4
          i32.const -127
          local.get $l4
          i32.const -127
          i32.gt_s
          select
          local.tee $l4
          i32.const 127
          local.get $l4
          i32.const 127
          i32.lt_s
          select
          local.set $l4
        end
        block $B46
          block $B47
            block $B48
              local.get $p0
              i32.load offset=12
              br_if $B48
              local.get $p0
              i32.load offset=8
              local.get $p0
              i32.load offset=4
              local.tee $l10
              i32.ne
              br_if $B47
            end
            local.get $p0
            i32.const 1
            i32.store offset=12
            br $B46
          end
          local.get $p0
          local.get $l10
          i32.const 1
          i32.add
          i32.store offset=4
          local.get $p0
          i32.load
          local.get $l10
          i32.add
          local.get $l4
          i32.store8
        end
        block $B49
          block $B50
            f32.const -0x1.f4p+10 (;=-2000;)
            f32.const 0x1.f4p+9 (;=1000;)
            local.get $l8
            i32.const 104
            i32.add
            f32.load
            local.tee $l5
            local.get $l5
            f32.const 0x1.f4p+9 (;=1000;)
            f32.gt
            select
            local.tee $l6
            local.get $l6
            f32.add
            local.get $l5
            f32.const -0x1.f4p+9 (;=-1000;)
            f32.lt
            select
            local.tee $l5
            local.get $l5
            f32.eq
            br_if $B50
            i32.const 0
            local.set $l4
            br $B49
          end
          block $B51
            local.get $l5
            f32.const 0x1.fffffep+30 (;=2.14748e+09;)
            f32.ge
            i32.eqz
            br_if $B51
            i32.const 127
            local.set $l4
            br $B49
          end
          block $B52
            local.get $l5
            f32.const -0x1.fffffep+30 (;=-2.14748e+09;)
            f32.le
            i32.eqz
            br_if $B52
            i32.const 129
            local.set $l4
            br $B49
          end
          local.get $l5
          f32.const 0x1p-1 (;=0.5;)
          f32.const -0x1p-1 (;=-0.5;)
          local.get $l5
          f32.const 0x0p+0 (;=0;)
          f32.ge
          select
          f32.add
          i32.trunc_sat_f32_s
          local.tee $l4
          i32.const -127
          local.get $l4
          i32.const -127
          i32.gt_s
          select
          local.tee $l4
          i32.const 127
          local.get $l4
          i32.const 127
          i32.lt_s
          select
          local.set $l4
        end
        block $B53
          block $B54
            block $B55
              local.get $p0
              i32.load offset=12
              br_if $B55
              local.get $p0
              i32.load offset=8
              local.get $p0
              i32.load offset=4
              local.tee $l8
              i32.eq
              br_if $B55
              local.get $p0
              local.get $l8
              i32.const 1
              i32.add
              i32.store offset=4
              local.get $p0
              i32.load
              local.get $l8
              i32.add
              local.get $l4
              i32.store8
              local.get $p0
              i32.load offset=12
              br_if $B55
              local.get $p0
              i32.load offset=8
              local.get $p0
              i32.load offset=4
              local.tee $l4
              i32.ne
              br_if $B54
            end
            local.get $p0
            i32.const 1
            i32.store offset=12
            br $B53
          end
          local.get $l7
          i32.load8_u
          local.set $l8
          local.get $p0
          local.get $l4
          i32.const 1
          i32.add
          i32.store offset=4
          local.get $p0
          i32.load
          local.get $l4
          i32.add
          local.get $l8
          i32.store8
        end
        local.get $l7
        i32.const 1
        i32.add
        local.set $l7
        local.get $l2
        i32.const 8
        i32.add
        local.tee $l2
        i32.const 32
        i32.ne
        br_if $L42
      end
    end
    block $B56
      local.get $l9
      i32.eqz
      br_if $B56
      block $B57
        block $B58
          local.get $p0
          i32.load offset=12
          br_if $B58
          local.get $p0
          i32.load offset=8
          local.get $p0
          i32.load offset=4
          local.tee $l2
          i32.sub
          i32.const 2
          i32.lt_u
          br_if $B58
          local.get $p0
          i32.load
          local.get $l2
          i32.add
          local.get $p1
          i32.load16_u offset=136
          local.tee $l2
          i32.const 20000
          local.get $l2
          i32.const 20000
          i32.lt_u
          select
          local.tee $l2
          i32.store8
          local.get $p0
          i32.load
          local.get $p0
          i32.load offset=4
          i32.add
          i32.const 1
          i32.add
          local.get $l2
          i32.const 8
          i32.shr_u
          i32.store8
          local.get $p0
          local.get $p0
          i32.load offset=4
          local.tee $l4
          i32.const 2
          i32.add
          local.tee $l2
          i32.store offset=4
          local.get $p0
          i32.load offset=12
          br_if $B58
          local.get $p0
          i32.load offset=8
          local.get $l2
          i32.eq
          br_if $B58
          local.get $p1
          i32.load8_u offset=138
          local.set $l7
          local.get $p0
          local.get $l4
          i32.const 3
          i32.add
          i32.store offset=4
          local.get $p0
          i32.load
          local.get $l2
          i32.add
          local.get $l7
          i32.store8
          local.get $p0
          i32.load offset=12
          br_if $B58
          local.get $p0
          i32.load offset=8
          local.get $p0
          i32.load offset=4
          local.tee $l2
          i32.eq
          br_if $B58
          local.get $p1
          i32.load8_u offset=139
          local.set $l4
          local.get $p0
          local.get $l2
          i32.const 1
          i32.add
          i32.store offset=4
          local.get $p0
          i32.load
          local.get $l2
          i32.add
          local.get $l4
          i32.store8
          local.get $p0
          i32.load offset=12
          br_if $B58
          local.get $p0
          i32.load offset=8
          local.get $p0
          i32.load offset=4
          local.tee $l2
          i32.ne
          br_if $B57
        end
        local.get $p0
        i32.const 1
        i32.store offset=12
        br $B56
      end
      local.get $p1
      i32.load8_u offset=140
      local.set $l4
      local.get $p0
      local.get $l2
      i32.const 1
      i32.add
      i32.store offset=4
      local.get $p0
      i32.load
      local.get $l2
      i32.add
      local.get $l4
      i32.store8
    end
    block $B59
      local.get $l3
      i32.eqz
      br_if $B59
      block $B60
        block $B61
          local.get $p0
          i32.load offset=12
          br_if $B61
          local.get $p0
          i32.load offset=8
          local.get $p0
          i32.load offset=4
          local.tee $l2
          i32.ne
          br_if $B60
        end
        local.get $p0
        i32.const 1
        i32.store offset=12
        return
      end
      local.get $p1
      i32.load8_u offset=142
      local.set $l4
      local.get $p1
      i32.load8_u offset=141
      local.set $p1
      local.get $p0
      local.get $l2
      i32.const 1
      i32.add
      i32.store offset=4
      local.get $p0
      i32.load
      local.get $l2
      i32.add
      i32.const 16
      i32.const 0
      local.get $l4
      select
      local.get $p1
      i32.const 15
      i32.and
      i32.or
      i32.store8
    end)
