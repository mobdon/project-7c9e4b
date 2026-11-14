  (func $f24560 (type $t4) (param $p0 i32) (result i32)
    (local $l1 i32) (local $l2 i32) (local $l3 i32)
    local.get $p0
    local.set $l1
    block $B0
      block $B1
        local.get $p0
        i32.const 3
        i32.and
        i32.eqz
        br_if $B1
        block $B2
          local.get $p0
          i32.load8_u
          br_if $B2
          local.get $p0
          local.get $p0
          i32.sub
          return
        end
        local.get $p0
        i32.const 1
        i32.add
        local.tee $l1
        i32.const 3
        i32.and
        i32.eqz
        br_if $B1
        local.get $l1
        i32.load8_u
        i32.eqz
        br_if $B0
        local.get $p0
        i32.const 2
        i32.add
        local.tee $l1
        i32.const 3
        i32.and
        i32.eqz
        br_if $B1
        local.get $l1
        i32.load8_u
        i32.eqz
        br_if $B0
        local.get $p0
        i32.const 3
        i32.add
        local.tee $l1
        i32.const 3
        i32.and
        i32.eqz
        br_if $B1
        local.get $l1
        i32.load8_u
        i32.eqz
        br_if $B0
        local.get $p0
        i32.const 4
        i32.add
        local.tee $l1
        i32.const 3
        i32.and
        br_if $B0
      end
      local.get $l1
      i32.const -4
      i32.add
      local.set $l2
      local.get $l1
      i32.const -5
      i32.add
      local.set $l1
      loop $L3
        local.get $l1
        i32.const 4
        i32.add
        local.set $l1
        i32.const 16843008
        local.get $l2
        i32.const 4
        i32.add
        local.tee $l2
        i32.load
        local.tee $l3
        i32.sub
        local.get $l3
        i32.or
        i32.const -2139062144
        i32.and
        i32.const -2139062144
        i32.eq
        br_if $L3
      end
      loop $L4
        local.get $l1
        i32.const 1
        i32.add
        local.set $l1
        local.get $l2
        i32.load8_u
        local.set $l3
        local.get $l2
        i32.const 1
        i32.add
        local.set $l2
        local.get $l3
        br_if $L4
      end
    end
    local.get $l1
    local.get $p0
    i32.sub)
