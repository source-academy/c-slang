(module
	(func $main
		(local $x_0 i32)
		(local $y_1 i32)
		(local.set $x_0 (i32.const 2))
		(if (i32.eq (local.get $x_0) (i32.const 1)) (then (local.set $y_1 (i32.const 1)) (local.set $x_0 (i32.const 1))) (else(if (i32.eq (local.get $x_0) (i32.const 2)) (then (local.set $y_1 (i32.const 2)) (local.set $x_0 (i32.const 100))) (else(if (i32.eq (local.get $x_0) (i32.const 3)) (then (local.set $y_1 (i32.const 3)) (local.set $x_0 (i32.const 3))) (else(local.set $y_1 (i32.const 4)) (local.set $x_0 (i32.const 4))))))))
	)
	(start $main)
)
