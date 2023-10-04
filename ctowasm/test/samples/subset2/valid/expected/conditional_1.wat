(module
	(func $main
		(local $x_0 i32)
		(local $y_0 i32)
		(local.set $x_0 (i32.const 12))
		(local.set $y_0 (i32.or (i32.or (i32.or (i32.and (i32.ne (i32.const 0) (i32.const 4)) (i32.ne (i32.const 0) (i32.const 12))) (i32.and (i32.ne (i32.const 0) (i32.const 23)) (i32.ne (i32.const 0) (local.get $x_0)))) (i32.ne (i32.const 0) (i32.const 123))) (i32.and (i32.ne (i32.const 0) (i32.const 22)) (i32.ne (i32.const 0) (local.get $x_0)))))
	)
	(start $main)
)
