  (func $f22854 (type $t9) (param $p0 i32) (param $p1 i32)
    (local $l2 i32) (local $l3 i32) (local $l4 i32) (local $l5 f32) (local $l6 f32) (local $l7 f32) (local $l8 f32) (local $l9 f32) (local $l10 f32) (local $l11 f32) (local $l12 f32) (local $l13 f32) (local $l14 i32) (local $l15 i32)
    block $B0
      block $B1
        block $B2
          block $B3
            block $B4
              block $B5
                local.get $p0
                i32.load offset=12
                br_if $B5
                local.get $p0
                i32.load offset=8
                local.get $p0
                i32.load offset=4
                local.tee $l2
                i32.sub
                i32.const 3
                i32.gt_u
                br_if $B4
              end
              local.get $p0
              i32.const 1
              i32.store offset=12
              local.get $p0
              i32.const 4
              i32.add
              local.set $l3
              local.get $p0
              i32.const 8
              i32.add
              local.set $l2
              br $B3
            end
            local.get $p0
            i32.load
            local.get $l2
            i32.add
            local.get $p1
            i32.load
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
            i32.load
            local.get $p0
            i32.load offset=4
            i32.add
            i32.const 2
            i32.add
            local.get $l2
            i32.const 16
            i32.shr_u
            i32.store8
            local.get $p0
            i32.load
            local.get $p0
            i32.load offset=4
            i32.add
            i32.const 3
            i32.add
            local.get $l2
            i32.const 24
            i32.shr_u
            i32.store8
            local.get $p0
            local.get $p0
            i32.load offset=4
            i32.const 4
            i32.add
            i32.store offset=4
            local.get $p0
            i32.const 4
            i32.add
            local.set $l3
            local.get $p0
            i32.const 8
            i32.add
            local.set $l2
            local.get $p0
            i32.load offset=12
            br_if $B3
            local.get $l2
            i32.load
            local.get $l3
            i32.load
            local.tee $l4
            i32.sub
            i32.const 4
            i32.lt_u
            br_if $B3
            local.get $p0
            i32.load
            local.get $l4
            i32.add
            local.get $p1
            i32.load offset=4
            local.tee $l4
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
            i32.load
            local.get $p0
            i32.load offset=4
            i32.add
            i32.const 2
            i32.add
            local.get $l4
            i32.const 16
            i32.shr_u
            i32.store8
            local.get $p0
            i32.load
            local.get $p0
            i32.load offset=4
            i32.add
            i32.const 3
            i32.add
            local.get $l4
            i32.const 24
            i32.shr_u
            i32.store8
            local.get $p0
            local.get $p0
            i32.load offset=4
            i32.const 4
            i32.add
            i32.store offset=4
            local.get $p0
            i32.load offset=12
            br_if $B3
            local.get $l2
            i32.load
            local.get $l3
            i32.load
            local.tee $l4
            i32.sub
            i32.const 4
            i32.lt_u
            br_if $B3
            local.get $p0
            i32.load
            local.get $l4
            i32.add
            local.get $p1
            i32.load offset=8
            local.tee $l4
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
            i32.load
            local.get $p0
            i32.load offset=4
            i32.add
            i32.const 2
            i32.add
            local.get $l4
            i32.const 16
            i32.shr_u
            i32.store8
            local.get $p0
            i32.load
            local.get $p0
            i32.load offset=4
            i32.add
            i32.const 3
            i32.add
            local.get $l4
            i32.const 24
            i32.shr_u
            i32.store8
            local.get $p0
            local.get $p0
            i32.load offset=4
            i32.const 4
            i32.add
            i32.store offset=4
            local.get $p0
            i32.load offset=12
            br_if $B3
            local.get $l2
            i32.load
            local.get $l3
            i32.load
            local.tee $l4
            i32.sub
            i32.const 3
            i32.gt_u
            br_if $B2
          end
          local.get $p0
          i32.const 1
          i32.store offset=12
          br $B1
        end
        local.get $p0
        i32.load
        local.get $l4
        i32.add
        local.get $p1
        i32.load offset=12
        local.tee $l4
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
        i32.load
        local.get $p0
        i32.load offset=4
        i32.add
        i32.const 2
        i32.add
        local.get $l4
        i32.const 16
        i32.shr_u
        i32.store8
        local.get $p0
        i32.load
        local.get $p0
        i32.load offset=4
        i32.add
        i32.const 3
        i32.add
        local.get $l4
        i32.const 24
        i32.shr_u
        i32.store8
        local.get $p0
        local.get $p0
        i32.load offset=4
        i32.const 4
        i32.add
        i32.store offset=4
        local.get $p0
        i32.load offset=12
        br_if $B1
        local.get $l2
        i32.load
        local.get $l3
        i32.load
        local.tee $l4
        i32.sub
        i32.const 4
        i32.lt_u
        br_if $B1
        local.get $p0
        i32.load
        local.get $l4
        i32.add
        local.get $p1
        i32.load offset=16
        local.tee $l4
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
        i32.load
        local.get $p0
        i32.load offset=4
        i32.add
        i32.const 2
        i32.add
        local.get $l4
        i32.const 16
        i32.shr_u
        i32.store8
        local.get $p0
        i32.load
        local.get $p0
        i32.load offset=4
        i32.add
        i32.const 3
        i32.add
        local.get $l4
        i32.const 24
        i32.shr_u
        i32.store8
        local.get $p0
        local.get $p0
        i32.load offset=4
        i32.const 4
        i32.add
        i32.store offset=4
        local.get $p0
        i32.load offset=12
        br_if $B1
        local.get $l2
        i32.load
        local.get $l3
        i32.load
        local.tee $l4
        i32.sub
        i32.const 4
        i32.lt_u
        br_if $B1
        local.get $p0
        i32.load
        local.get $l4
        i32.add
        local.get $p1
        i32.load offset=20
        local.tee $l4
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
        i32.load
        local.get $p0
        i32.load offset=4
        i32.add
        i32.const 2
        i32.add
        local.get $l4
        i32.const 16
        i32.shr_u
        i32.store8
        local.get $p0
        i32.load
        local.get $p0
        i32.load offset=4
        i32.add
        i32.const 3
        i32.add
        local.get $l4
        i32.const 24
        i32.shr_u
        i32.store8
        local.get $p0
        local.get $p0
        i32.load offset=4
        i32.const 4
        i32.add
        i32.store offset=4
        local.get $p0
        i32.load offset=12
        br_if $B1
        local.get $l2
        i32.load
        local.get $l3
        i32.load
        local.tee $l4
        i32.sub
        i32.const 4
        i32.lt_u
        br_if $B1
        local.get $p0
        i32.load
        local.get $l4
        i32.add
        local.get $p1
        i32.load offset=24
        local.tee $l4
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
        i32.load
        local.get $p0
        i32.load offset=4
        i32.add
        i32.const 2
        i32.add
        local.get $l4
        i32.const 16
        i32.shr_u
        i32.store8
        local.get $p0
        i32.load
        local.get $p0
        i32.load offset=4
        i32.add
        i32.const 3
        i32.add
        local.get $l4
        i32.const 24
        i32.shr_u
        i32.store8
        local.get $p0
        local.get $p0
        i32.load offset=4
        i32.const 4
        i32.add
        i32.store offset=4
        br $B0
      end
      local.get $p0
      i32.const 1
      i32.store offset=12
    end
    f32.const 0x1.fffcp+14 (;=32767;)
    local.set $l5
    f32.const 0x0p+0 (;=0;)
    local.set $l6
    f32.const 0x0p+0 (;=0;)
    local.set $l7
    f32.const 0x0p+0 (;=0;)
    local.set $l8
    block $B6
      block $B7
        local.get $p1
        f32.load offset=28
        local.tee $l9
        local.get $l9
        f32.mul
        local.get $p1
        f32.load offset=32
        local.tee $l10
        local.get $l10
        f32.mul
        f32.add
        local.get $p1
        f32.load offset=36
        local.tee $l11
        local.get $l11
        f32.mul
        f32.add
        local.get $p1
        f32.load offset=40
        local.tee $l12
        local.get $l12
        f32.mul
        f32.add
        local.tee $l13
        f32.const 0x1.197998p-40 (;=1e-12;)
        f32.lt
        br_if $B7
        local.get $l12
        f32.const 0x1p+0 (;=1;)
        local.get $l13
        f32.sqrt
        f32.div
        f32.const inf (;=inf;)
        local.get $l13
        f32.const 0x0p+0 (;=0;)
        f32.gt
        select
        local.tee $l6
        f32.mul
        f32.const 0x1.fffcp+14 (;=32767;)
        f32.mul
        local.set $l5
        local.get $l11
        local.get $l6
        f32.mul
        f32.const 0x1.fffcp+14 (;=32767;)
        f32.mul
        local.set $l8
        local.get $l10
        local.get $l6
        f32.mul
        f32.const 0x1.fffcp+14 (;=32767;)
        f32.mul
        local.set $l7
        block $B8
          local.get $l9
          local.get $l6
          f32.mul
          f32.const 0x1.fffcp+14 (;=32767;)
          f32.mul
          local.tee $l6
          local.get $l6
          f32.eq
          br_if $B8
          i32.const 0
          local.set $l4
          br $B6
        end
        block $B9
          local.get $l6
          f32.const 0x1.fffffep+30 (;=2.14748e+09;)
          f32.ge
          i32.eqz
          br_if $B9
          i32.const 32767
          local.set $l4
          br $B6
        end
        local.get $l6
        f32.const -0x1.fffffep+30 (;=-2.14748e+09;)
        f32.le
        i32.eqz
        br_if $B7
        i32.const 32769
        local.set $l4
        br $B6
      end
      local.get $l6
      f32.const 0x1p-1 (;=0.5;)
      f32.const -0x1p-1 (;=-0.5;)
      local.get $l6
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
    block $B10
      block $B11
        block $B12
          local.get $p0
          i32.load offset=12
          br_if $B12
          local.get $l2
          i32.load
          local.get $l3
          i32.load
          local.tee $l14
          i32.sub
          i32.const 1
          i32.gt_u
          br_if $B11
        end
        local.get $p0
        i32.const 1
        i32.store offset=12
        br $B10
      end
      local.get $p0
      i32.load
      local.get $l14
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
    block $B13
      block $B14
        local.get $l7
        local.get $l7
        f32.eq
        br_if $B14
        i32.const 0
        local.set $l4
        br $B13
      end
      block $B15
        local.get $l7
        f32.const 0x1.fffffep+30 (;=2.14748e+09;)
        f32.ge
        i32.eqz
        br_if $B15
        i32.const 32767
        local.set $l4
        br $B13
      end
      block $B16
        local.get $l7
        f32.const -0x1.fffffep+30 (;=-2.14748e+09;)
        f32.le
        i32.eqz
        br_if $B16
        i32.const 32769
        local.set $l4
        br $B13
      end
      local.get $l7
      f32.const 0x1p-1 (;=0.5;)
      f32.const -0x1p-1 (;=-0.5;)
      local.get $l7
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
    block $B17
      block $B18
        local.get $p0
        i32.load offset=12
        br_if $B18
        local.get $l2
        i32.load
        local.get $l3
        i32.load
        local.tee $l14
        i32.sub
        i32.const 2
        i32.lt_u
        br_if $B18
        local.get $p0
        i32.load
        local.get $l14
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
        br $B17
      end
      local.get $p0
      i32.const 1
      i32.store offset=12
    end
    block $B19
      block $B20
        local.get $l8
        local.get $l8
        f32.eq
        br_if $B20
        i32.const 0
        local.set $l4
        br $B19
      end
      block $B21
        local.get $l8
        f32.const 0x1.fffffep+30 (;=2.14748e+09;)
        f32.ge
        i32.eqz
        br_if $B21
        i32.const 32767
        local.set $l4
        br $B19
      end
      block $B22
        local.get $l8
        f32.const -0x1.fffffep+30 (;=-2.14748e+09;)
        f32.le
        i32.eqz
        br_if $B22
        i32.const 32769
        local.set $l4
        br $B19
      end
      local.get $l8
      f32.const 0x1p-1 (;=0.5;)
      f32.const -0x1p-1 (;=-0.5;)
      local.get $l8
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
    block $B23
      block $B24
        local.get $p0
        i32.load offset=12
        br_if $B24
        local.get $l2
        i32.load
        local.get $l3
        i32.load
        local.tee $l14
        i32.sub
        i32.const 2
        i32.lt_u
        br_if $B24
        local.get $p0
        i32.load
        local.get $l14
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
        br $B23
      end
      local.get $p0
      i32.const 1
      i32.store offset=12
    end
    block $B25
      block $B26
        local.get $l5
        local.get $l5
        f32.eq
        br_if $B26
        i32.const 0
        local.set $l4
        br $B25
      end
      block $B27
        local.get $l5
        f32.const 0x1.fffffep+30 (;=2.14748e+09;)
        f32.ge
        i32.eqz
        br_if $B27
        i32.const 32767
        local.set $l4
        br $B25
      end
      block $B28
        local.get $l5
        f32.const -0x1.fffffep+30 (;=-2.14748e+09;)
        f32.le
        i32.eqz
        br_if $B28
        i32.const 32769
        local.set $l4
        br $B25
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
    block $B29
      block $B30
        local.get $p0
        i32.load offset=12
        br_if $B30
        local.get $l2
        i32.load
        local.get $l3
        i32.load
        local.tee $l14
        i32.sub
        i32.const 2
        i32.lt_u
        br_if $B30
        local.get $p0
        i32.load
        local.get $l14
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
        br $B29
      end
      local.get $p0
      i32.const 1
      i32.store offset=12
    end
    block $B31
      block $B32
        local.get $p1
        f32.load offset=44
        f32.const 0x1.f4p+9 (;=1000;)
        f32.mul
        local.tee $l5
        local.get $l5
        f32.eq
        br_if $B32
        i32.const 0
        local.set $l4
        br $B31
      end
      block $B33
        local.get $l5
        f32.const 0x1.fffffep+30 (;=2.14748e+09;)
        f32.ge
        i32.eqz
        br_if $B33
        i32.const 32767
        local.set $l4
        br $B31
      end
      block $B34
        local.get $l5
        f32.const -0x1.fffffep+30 (;=-2.14748e+09;)
        f32.le
        i32.eqz
        br_if $B34
        i32.const 32769
        local.set $l4
        br $B31
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
    block $B35
      block $B36
        block $B37
          local.get $p0
          i32.load offset=12
          br_if $B37
          local.get $l2
          i32.load
          local.get $l3
          i32.load
          local.tee $l14
          i32.sub
          i32.const 1
          i32.gt_u
          br_if $B36
        end
        local.get $p0
        i32.const 1
        i32.store offset=12
        br $B35
      end
      local.get $p0
      i32.load
      local.get $l14
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
    block $B38
      block $B39
        local.get $p1
        f32.load offset=48
        f32.const 0x1.f4p+9 (;=1000;)
        f32.mul
        local.tee $l5
        local.get $l5
        f32.eq
        br_if $B39
        i32.const 0
        local.set $l4
        br $B38
      end
      block $B40
        local.get $l5
        f32.const 0x1.fffffep+30 (;=2.14748e+09;)
        f32.ge
        i32.eqz
        br_if $B40
        i32.const 32767
        local.set $l4
        br $B38
      end
      block $B41
        local.get $l5
        f32.const -0x1.fffffep+30 (;=-2.14748e+09;)
        f32.le
        i32.eqz
        br_if $B41
        i32.const 32769
        local.set $l4
        br $B38
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
    block $B42
      block $B43
        local.get $p0
        i32.load offset=12
        br_if $B43
        local.get $l2
        i32.load
        local.get $l3
        i32.load
        local.tee $l14
        i32.sub
        i32.const 2
        i32.lt_u
        br_if $B43
        local.get $p0
        i32.load
        local.get $l14
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
        br $B42
      end
      local.get $p0
      i32.const 1
      i32.store offset=12
    end
    block $B44
      block $B45
        local.get $p1
        f32.load offset=52
        f32.const 0x1.f4p+9 (;=1000;)
        f32.mul
        local.tee $l5
        local.get $l5
        f32.eq
        br_if $B45
        i32.const 0
        local.set $l4
        br $B44
      end
      block $B46
        local.get $l5
        f32.const 0x1.fffffep+30 (;=2.14748e+09;)
        f32.ge
        i32.eqz
        br_if $B46
        i32.const 32767
        local.set $l4
        br $B44
      end
      block $B47
        local.get $l5
        f32.const -0x1.fffffep+30 (;=-2.14748e+09;)
        f32.le
        i32.eqz
        br_if $B47
        i32.const 32769
        local.set $l4
        br $B44
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
    block $B48
      block $B49
        local.get $p0
        i32.load offset=12
        br_if $B49
        local.get $l2
        i32.load
        local.get $l3
        i32.load
        local.tee $l14
        i32.sub
        i32.const 2
        i32.lt_u
        br_if $B49
        local.get $p0
        i32.load
        local.get $l14
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
        br $B48
      end
      local.get $p0
      i32.const 1
      i32.store offset=12
    end
    block $B50
      block $B51
        f32.const -0x1.fffcp+14 (;=-32767;)
        f32.const 0x1p+0 (;=1;)
        local.get $p1
        f32.load offset=56
        local.tee $l5
        local.get $l5
        f32.const 0x1p+0 (;=1;)
        f32.gt
        select
        f32.const 0x1.fffcp+14 (;=32767;)
        f32.mul
        local.get $l5
        f32.const -0x1p+0 (;=-1;)
        f32.lt
        select
        local.tee $l5
        local.get $l5
        f32.eq
        br_if $B51
        i32.const 0
        local.set $l4
        br $B50
      end
      block $B52
        local.get $l5
        f32.const 0x1.fffffep+30 (;=2.14748e+09;)
        f32.ge
        i32.eqz
        br_if $B52
        i32.const 32767
        local.set $l4
        br $B50
      end
      block $B53
        local.get $l5
        f32.const -0x1.fffffep+30 (;=-2.14748e+09;)
        f32.le
        i32.eqz
        br_if $B53
        i32.const 32769
        local.set $l4
        br $B50
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
    block $B54
      block $B55
        block $B56
          local.get $p0
          i32.load offset=12
          br_if $B56
          local.get $l2
          i32.load
          local.get $l3
          i32.load
          local.tee $l14
          i32.sub
          i32.const 1
          i32.gt_u
          br_if $B55
        end
        local.get $p0
        i32.const 1
        i32.store offset=12
        br $B54
      end
      local.get $p0
      i32.load
      local.get $l14
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
    i32.const 0
    local.set $l4
    block $B57
      f32.const 0x0p+0 (;=0;)
      f32.const 0x1p+0 (;=1;)
      local.get $p1
      f32.load offset=60
      local.tee $l5
      local.get $l5
      f32.const 0x1p+0 (;=1;)
      f32.gt
      select
      f32.const 0x1.fep+7 (;=255;)
      f32.mul
      local.get $l5
      f32.const 0x0p+0 (;=0;)
      f32.lt
      select
      local.tee $l5
      local.get $l5
      f32.ne
      br_if $B57
      i32.const 255
      local.set $l4
      local.get $l5
      f32.const 0x1.fffffep+30 (;=2.14748e+09;)
      f32.ge
      br_if $B57
      i32.const 0
      local.set $l4
      local.get $l5
      f32.const -0x1.fffffep+30 (;=-2.14748e+09;)
      f32.le
      br_if $B57
      local.get $l5
      f32.const 0x1p-1 (;=0.5;)
      f32.const -0x1p-1 (;=-0.5;)
      local.get $l5
      f32.const 0x0p+0 (;=0;)
      f32.ge
      select
      f32.add
      i32.trunc_sat_f32_s
      local.set $l4
    end
    block $B58
      block $B59
        block $B60
          local.get $p0
          i32.load offset=12
          br_if $B60
          local.get $l2
          i32.load
          local.get $l3
          i32.load
          local.tee $l14
          i32.ne
          br_if $B59
        end
        local.get $p0
        i32.const 1
        i32.store offset=12
        br $B58
      end
      local.get $p0
      local.get $l14
      i32.const 1
      i32.add
      i32.store offset=4
      local.get $p0
      i32.load
      local.get $l14
      i32.add
      local.get $l4
      i32.store8
    end
    i32.const 0
    local.set $l4
    block $B61
      f32.const 0x0p+0 (;=0;)
      f32.const 0x1p+0 (;=1;)
      local.get $p1
      f32.load offset=64
      local.tee $l5
      local.get $l5
      f32.const 0x1p+0 (;=1;)
      f32.gt
      select
      f32.const 0x1.fep+7 (;=255;)
      f32.mul
      local.get $l5
      f32.const 0x0p+0 (;=0;)
      f32.lt
      select
      local.tee $l5
      local.get $l5
      f32.ne
      br_if $B61
      i32.const 255
      local.set $l4
      local.get $l5
      f32.const 0x1.fffffep+30 (;=2.14748e+09;)
      f32.ge
      br_if $B61
      i32.const 0
      local.set $l4
      local.get $l5
      f32.const -0x1.fffffep+30 (;=-2.14748e+09;)
      f32.le
      br_if $B61
      local.get $l5
      f32.const 0x1p-1 (;=0.5;)
      f32.const -0x1p-1 (;=-0.5;)
      local.get $l5
      f32.const 0x0p+0 (;=0;)
      f32.ge
      select
      f32.add
      i32.trunc_sat_f32_s
      local.set $l4
    end
    block $B62
      block $B63
        block $B64
          local.get $p0
          i32.load offset=12
          br_if $B64
          local.get $l2
          i32.load
          local.get $l3
          i32.load
          local.tee $l14
          i32.ne
          br_if $B63
        end
        local.get $p0
        i32.const 1
        i32.store offset=12
        br $B62
      end
      local.get $p0
      local.get $l14
      i32.const 1
      i32.add
      i32.store offset=4
      local.get $p0
      i32.load
      local.get $l14
      i32.add
      local.get $l4
      i32.store8
    end
    block $B65
      block $B66
        f32.const 0x0p+0 (;=0;)
        f32.const 0x1.fffep+15 (;=65535;)
        local.get $p1
        f32.load offset=68
        local.tee $l5
        local.get $l5
        f32.const 0x1.fffep+15 (;=65535;)
        f32.gt
        select
        local.get $l5
        f32.const 0x0p+0 (;=0;)
        f32.lt
        select
        local.tee $l5
        local.get $l5
        f32.eq
        br_if $B66
        i32.const 0
        local.set $l4
        br $B65
      end
      block $B67
        local.get $l5
        f32.const 0x1.fffffep+30 (;=2.14748e+09;)
        f32.ge
        i32.eqz
        br_if $B67
        i32.const 2147483647
        local.set $l4
        br $B65
      end
      block $B68
        local.get $l5
        f32.const -0x1.fffffep+30 (;=-2.14748e+09;)
        f32.le
        i32.eqz
        br_if $B68
        i32.const -2147483648
        local.set $l4
        br $B65
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
      local.set $l4
    end
    block $B69
      block $B70
        block $B71
          local.get $p0
          i32.load offset=12
          br_if $B71
          local.get $l2
          i32.load
          local.get $l3
          i32.load
          local.tee $l14
          i32.sub
          i32.const 1
          i32.gt_u
          br_if $B70
        end
        local.get $p0
        i32.const 1
        i32.store offset=12
        br $B69
      end
      local.get $p0
      i32.load
      local.get $l14
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
    block $B72
      block $B73
        f32.const -0x1.fefp+14 (;=-32700;)
        f32.const 0x1.47p+8 (;=327;)
        local.get $p1
        f32.load offset=72
        local.tee $l5
        local.get $l5
        f32.const 0x1.47p+8 (;=327;)
        f32.gt
        select
        f32.const 0x1.9p+6 (;=100;)
        f32.mul
        local.get $l5
        f32.const -0x1.47p+8 (;=-327;)
        f32.lt
        select
        local.tee $l5
        local.get $l5
        f32.eq
        br_if $B73
        i32.const 0
        local.set $l4
        br $B72
      end
      block $B74
        local.get $l5
        f32.const 0x1.fffffep+30 (;=2.14748e+09;)
        f32.ge
        i32.eqz
        br_if $B74
        i32.const 32767
        local.set $l4
        br $B72
      end
      block $B75
        local.get $l5
        f32.const -0x1.fffffep+30 (;=-2.14748e+09;)
        f32.le
        i32.eqz
        br_if $B75
        i32.const 32769
        local.set $l4
        br $B72
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
    block $B76
      block $B77
        local.get $p0
        i32.load offset=12
        br_if $B77
        local.get $l2
        i32.load
        local.get $l3
        i32.load
        local.tee $l14
        i32.sub
        i32.const 2
        i32.lt_u
        br_if $B77
        local.get $p0
        i32.load
        local.get $l14
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
        local.tee $l14
        i32.const 2
        i32.add
        local.tee $l4
        i32.store offset=4
        local.get $p0
        i32.load offset=12
        br_if $B77
        local.get $l2
        i32.load
        local.get $l4
        i32.eq
        br_if $B77
        local.get $p1
        i32.load8_u offset=76
        local.set $l15
        local.get $p0
        local.get $l14
        i32.const 3
        i32.add
        i32.store offset=4
        local.get $p0
        i32.load
        local.get $l4
        i32.add
        local.get $l15
        i32.store8
        local.get $p0
        i32.load offset=12
        br_if $B77
        local.get $l2
        i32.load
        local.get $l3
        i32.load
        local.tee $l2
        i32.ne
        br_if $B76
      end
      local.get $p0
      i32.const 1
      i32.store offset=12
      return
    end
    local.get $p1
    i32.load8_u offset=77
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
    local.get $p1
    i32.store8)
