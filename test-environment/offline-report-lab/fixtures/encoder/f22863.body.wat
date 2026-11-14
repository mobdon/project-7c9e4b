  (func $f22863 (type $t4) (param $p0 i32) (result i32)
    block $B0
      local.get $p0
      i32.load8_u
      br_if $B0
      i32.const 0
      return
    end
    block $B1
      local.get $p0
      i32.load8_u offset=1
      br_if $B1
      i32.const 1
      return
    end
    block $B2
      local.get $p0
      i32.load8_u offset=2
      br_if $B2
      i32.const 2
      return
    end
    block $B3
      local.get $p0
      i32.load8_u offset=3
      br_if $B3
      i32.const 3
      return
    end
    block $B4
      local.get $p0
      i32.load8_u offset=4
      br_if $B4
      i32.const 4
      return
    end
    block $B5
      local.get $p0
      i32.load8_u offset=5
      br_if $B5
      i32.const 5
      return
    end
    block $B6
      local.get $p0
      i32.load8_u offset=6
      br_if $B6
      i32.const 6
      return
    end
    block $B7
      local.get $p0
      i32.load8_u offset=7
      br_if $B7
      i32.const 7
      return
    end
    i32.const 9
    i32.const 8
    local.get $p0
    i32.load8_u offset=8
    select)
