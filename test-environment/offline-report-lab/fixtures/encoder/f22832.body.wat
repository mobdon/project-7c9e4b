  (func $f22832 (type $t9) (param $p0 i32) (param $p1 i32)
    (local $l2 i32)
    block $B0
      block $B1
        local.get $p0
        i32.load offset=12
        br_if $B1
        local.get $p0
        i32.load offset=8
        local.get $p0
        i32.load offset=4
        local.tee $l2
        i32.sub
        i32.const 3
        i32.gt_u
        br_if $B0
      end
      local.get $p0
      i32.const 1
      i32.store offset=12
      return
    end
    local.get $p0
    i32.load
    local.get $l2
    i32.add
    local.get $p1
    i32.store8
    local.get $p0
    i32.load
    local.get $p0
    i32.load offset=4
    i32.add
    i32.const 1
    i32.add
    local.get $p1
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
    local.get $p1
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
    local.get $p1
    i32.const 24
    i32.shr_u
    i32.store8
    local.get $p0
    local.get $p0
    i32.load offset=4
    i32.const 4
    i32.add
    i32.store offset=4)
