(module
	(func $main
		(local $y_0 i32)
		(local $x_0 i32)
		(local.set $y_0 (i32.const 10))
		(local.set $x_0 (i32.sub (i32.add (local.set $y_0 (i32.add (i32.const 1) (local.get $y_0 (local.get $y_0)))) (i32.const 12)) (i32.sub (i32.mul (i32.sub (i32.const 8) (local.get $y_0 (local.set $y_0 (i32.sub (i32.const 1) (local.get $y_0))))) (local.get $y_0 (local.set $y_0 (i32.add (i32.const 1) (local.get $y_0))))) (local.set $y_0 (i32.sub (i32.const 1) (local.get $y_0 (local.get $y_0)))))))
	)
	(start $main)
)
