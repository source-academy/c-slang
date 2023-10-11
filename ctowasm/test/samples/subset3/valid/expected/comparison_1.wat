(module
	(func $main
		(local $x_0 i32)
		(local $y_0 i32)
		(local $z_0 i32)
		(local.set $x_0 (i32.const 2))
		(local.set $y_0 (i32.const 2))
		(local.set $z_0 (i32.eq (i32.ne (i32.le_s (local.get $x_0) (local.get $y_0)) (i32.gt_s (i32.const 3) (i32.const 2))) (i32.const 10)))
		(local.set $z_0 (i32.or (i32.ne (i32.const 0) (i32.gt_s (i32.const 1) (i32.const 2))) (i32.ne (i32.const 0) (i32.lt_s (i32.const 2) (i32.const 10)))))
		(local.set $z_0 (i32.and (i32.ne (i32.const 0) (i32.ne (i32.const 1) (i32.const 1))) (i32.ne (i32.const 0) (i32.const 10))))
	)
	(start $main)
)
