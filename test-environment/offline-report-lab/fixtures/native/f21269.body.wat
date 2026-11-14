  (func $f21269 (type $t2)
    (local $l0 i32) (local $l1 i32) (local $l2 i32) (local $l3 i32) (local $l4 i32) (local $l5 i32) (local $l6 i32) (local $l7 i32) (local $l8 i32) (local $l9 i32) (local $l10 i32) (local $l11 i32)
    global.get $g0
    i32.const 208
    i32.sub
    local.tee $l0
    global.set $g0
    call $f21774
    local.get $l0
    i32.const 0
    v128.load offset=673985296
    v128.store offset=192
    i32.const 0
    i32.load8_u offset=673985840
    local.set $l1
    i32.const 0
    i32.const 0
    i32.store8 offset=673985840
    i32.const 0
    i32.const 0
    i32.store offset=673985296
    block $B0
      block $B1
        local.get $l0
        i32.load offset=192
        local.tee $l2
        br_if $B1
        local.get $l1
        i32.eqz
        br_if $B0
        i32.const 0
        i32.const 128
        i32.const 671542349
        call $f21270
        br $B0
      end
      call $f21265
      local.get $l0
      i32.const 176
      i32.add
      call $f21266
      block $B2
        block $B3
          local.get $l0
          i32.load offset=176
          local.get $l2
          i32.ne
          br_if $B3
          local.get $l0
          i32.load offset=180
          local.get $l0
          i32.load offset=196
          i32.eq
          br_if $B2
        end
        local.get $l1
        i32.eqz
        br_if $B0
        i32.const 0
        i32.const 128
        i32.const 671542349
        call $f21270
        br $B0
      end
      i32.const -128
      i32.const 0
      local.get $l1
      select
      local.set $l3
      local.get $l0
      i32.const 0
      i32.store8 offset=16
      i32.const 0
      local.set $l4
      i32.const 0
      local.set $l5
      i32.const 0
      local.set $l6
      block $B4
        loop $L5
          local.get $l4
          local.tee $l7
          local.get $l6
          i32.const 3
          i32.shl
          local.tee $l1
          i32.load16_u offset=671559012
          local.tee $l8
          i32.add
          local.tee $l4
          i32.const 513
          i32.ge_u
          br_if $B4
          block $B6
            local.get $l0
            i32.const 192
            i32.add
            local.get $l1
            i32.const 671559008
            i32.add
            local.tee $l9
            i32.load8_u
            i32.const 2
            i32.shl
            local.tee $l2
            i32.add
            i32.load
            local.tee $l1
            i32.eqz
            br_if $B6
            local.get $l1
            local.get $l0
            i32.const 176
            i32.add
            local.get $l2
            i32.add
            i32.load
            i32.ne
            br_if $B6
            local.get $l7
            i32.const 673985328
            i32.add
            local.tee $l7
            local.get $l1
            local.get $l9
            i32.load16_u offset=2
            local.tee $l10
            i32.add
            local.tee $l11
            local.get $l8
            call $f23875
            i32.eqz
            br_if $B6
            local.get $l9
            i32.load8_u offset=6
            local.get $l3
            i32.or
            local.set $l3
            i32.const 0
            i32.load offset=672536788
            i32.eqz
            br_if $B6
            i32.const 0
            i32.load offset=673985288
            i32.eqz
            br_if $B6
            local.get $l5
            i32.const 120
            i32.gt_s
            br_if $B6
            i32.const 0
            local.set $l1
            loop $L7
              local.get $l11
              local.get $l1
              i32.add
              local.set $l2
              local.get $l7
              local.get $l1
              i32.add
              local.set $l9
              local.get $l1
              i32.const 1
              i32.add
              local.set $l1
              local.get $l9
              i32.load8_u
              local.get $l2
              i32.load8_u
              i32.eq
              br_if $L7
            end
            local.get $l7
            local.get $l1
            i32.const -1
            i32.add
            i32.const -4
            i32.and
            local.tee $l1
            i32.add
            i32.load align=1
            local.set $l2
            local.get $l0
            local.get $l11
            local.get $l1
            i32.add
            i32.load align=1
            i32.store offset=12
            local.get $l0
            local.get $l2
            i32.store offset=8
            local.get $l0
            local.get $l1
            local.get $l10
            i32.add
            i32.store offset=4
            local.get $l0
            i32.const 671280489
            i32.const 671247578
            i32.const 671259414
            local.get $l6
            i32.const 7
            i32.eq
            select
            local.get $l6
            i32.const 7
            i32.lt_u
            select
            i32.store
            local.get $l0
            i32.const 16
            i32.add
            local.get $l5
            i32.add
            i32.const 160
            local.get $l5
            i32.sub
            i32.const 671249581
            local.get $l0
            call $f24525
            local.get $l5
            i32.add
            local.set $l5
          end
          local.get $l6
          i32.const 1
          i32.add
          local.tee $l6
          i32.const 12
          i32.ne
          br_if $L5
        end
      end
      i32.const 1
      local.get $l3
      i32.const 255
      i32.and
      local.get $l0
      i32.const 16
      i32.add
      call $f21270
    end
    local.get $l0
    i32.const 208
    i32.add
    global.set $g0)
