(module
	(func $main
		(local $x_0 i32)
		(local $y_0 i32)
		(local.set $x_0 (i32.const 1))
		(local.set $y_0 (i32.and (i32.and (i32.ne (i32.const 0) (local.get $x_0)) (i32.ne (i32.const 0) (i32.const 10))) (i32.ne (i32.const 0) (i32.const 120))))
	)
	(start $main)
)
