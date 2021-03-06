(function(){
	function Spring3d(vector)
	{
		this.vel = new threeDimensions.Vector4();
		this.target = new threeDimensions.Vector4();
		this.vector = vector;
	}

	Spring3d.prototype.apply = function()
	{
		this.vel.x = this.vel.x * friction + spring * (this.target.x - this.vector.x);
		this.vel.y = this.vel.y * friction + spring * (this.target.y - this.vector.y);
		this.vel.z = this.vel.z * friction + spring * (this.target.z - this.vector.z);
	
		this.vector.x += this.vel.x;
		this.vector.y += this.vel.y;
		this.vector.z += this.vel.z;
	}

	function Spring2d(vector)
	{
		this.vector = vector;
		this.isInit = false;
	
		this.tx, this.ty;
		this.vx = 0, this.vy = 0;
	}

	Spring2d.prototype.apply =  function(mouseX, mouseY)
	{
		var v = this.vector;
		var otx = this.tx;
		var oty = this.ty;
		this.tx = v.tx;
		this.ty = v.ty;
		if(!this.isInit)
		{
			this.isInit = true;	
			return;
		}
		this.vx += spring2 * (v.tx - otx);
		this.vy += spring2 * (v.ty - oty);
		var dx = mouseX - this.tx;
		var dy = mouseY - this.ty;
		var d = dx * dx + dy * dy;
		if(d < mouseRadius2)
		{
			d = mouseRadius / Math.sqrt(d);
			this.vx += spring * (v.tx - mouseX - d * dx);
			this.vy += spring * (v.ty - mouseY - d * dy);
		}
	
		this.vx *= friction2;
		this.vy *= friction2;
		this.tx += this.vx;
		this.ty += this.vy;
		v.tx = this.tx;
		v.ty = this.ty;
	}

	function LinesRenderer(ctx)
	{
		this.ctx = ctx;
	}

	LinesRenderer.prototype.render = function(v)
	{
		this.ctx.strokeStyle = "hsl(100, 50%, 50%)";
		var n = v.length;
		this.ctx.beginPath();
		this.ctx.moveTo(v[0].tx, v[0].ty);
		for(var i = 1; i < n; i++)
		{
			var p = v[i];
			var op = v[i - 1];
			//this.ctx.lineTo(p.tx, p.ty);
			this.ctx.quadraticCurveTo(0.5 * (op.tx + p.tx), Math.max(p.ty, op.ty), p.tx, p.ty);	
		}
		this.ctx.stroke();
		this.ctx.closePath();
	}

	function DotsRenderer(ctx)
	{
		this.ctx = ctx;
	}

	DotsRenderer.prototype.render = function(v)
	{
		var n = v.length;
		this.ctx.beginPath();
		this.ctx.fillStyle = "black";
		for(var i = 0; i < n; i++)
		{
			this.ctx.rect(v[i].tx - 2, v[i].ty - 2, 4, 4);
		}
		this.ctx.fill();
		this.ctx.closePath();
	}
	
	function resize()
	{
		stage.resize(window.innerWidth || document.body.clientWidth,
					 window.innerHeight || document.body.clientHeight);
		var scale = 0.9 * Math.min(stage.width, stage.height);
		renderer.identity();
		renderer.scale(scale, -scale, scale);
		renderer.translate(0.5 * stage.width, 0.5 * (stage.height + scale), 0);
	}

	var stage = new tools.Stage(1000, 800);
	var mouse = new tools.Mouse();
	

	var projection = threeDimensions.Matrix4.projection(30, stage.width / stage.height, 1, 10000);
	var rotation = new threeDimensions.Matrix4();
	var transform = new threeDimensions.Matrix4();
	var renderer = new threeDimensions.Matrix4();
	resize();
	//renderer.appendTransform(projection);//no projection. who cares?
	var lineRenderer = new LinesRenderer(stage.out, stage.width, stage.height);
	var dotsRenderer = new DotsRenderer(stage.out, stage.width, stage.height);


	var vertices = [];
	var maxPts = 200;
	var n = 1;
	var ang = 0.5;
	var prev, old;
	var rMin = 0.1;
	var rMax = 0.5;
	var isUp = false;
	prev = new threeDimensions.Vector4();
	var spring = 0.01;
	var friction = 0.9;
	
	var nSnowflake = 0;
	var maxSnowflake = 50;

	//mouse
	var spring2 = 0.03;
	var spring3 = 0.01;
	var friction2 = 0.98;
	var mouseRadius = 150;
	var mouseRadius2 = mouseRadius * mouseRadius;

	prev.y = Math.random() * 0.3;
	vertices.push(prev);
	prev.spring3d = new Spring3d(prev);

	function addPoint()
	{
		var current = new threeDimensions.Vector4();
		var angle = Math.random() * 2 * Math.PI;
		var radius;
		if (n % 2)
		{
			//external
			current.y = prev.y * Math.random();
			radius = rMax * Math.random() * (1 - current.y);
			current.spring2d = new Spring2d(current);
		}
		else
		{
			//internal
			isUp = !isUp;
			if(isUp)current.y = interpolate(old.y, 1, Math.random());
			else current.y = interpolate(old.y, prev.y, Math.random())
		
			radius = rMin * Math.random() * (1 - current.y);
		}
		current.x = radius * Math.cos(angle);
		current.z = radius * Math.sin(angle);
	
		var s = new Spring3d(current);
		current.spring3d = s;
		s.target.x = current.x;
		s.target.y = current.y;
		s.target.z = current.z;
		current.x = prev.x;
		current.y = prev.y;
		current.z = prev.z;
		old = prev;
		prev = current;
		vertices.push(current);
		if(++n < maxPts) setTimeout(tools.delegate(addPoint, this), 700);
	}
	
	
	
	
	var snow = (function ()
	{
		function Particle(x, y, z)
		{
			this.x = x || 0;
			this.y = y || 0;
			this.a = 0;
			this.va = 0;
			this.vx = this.vy = 0;
			this.positions = [];
		}

		var n2 = 7;
		var v = 0.2	;
		var fr = 0.95;
		var wind = -0.05;
		var gravity = 0.1;
		var radius = 10;

		var out = stage.out;

		var ran = Math.random;

		function ran2(){return ran() * 2 - 1;}

		var particles = [];

		for(var i = 0; i < maxSnowflake; i++)
		{
			var p = new Particle();
			p.x = ran() * stage.width;
			p.y = ran() * stage.height;
			particles[i] = p;
			var r = (1 - i / maxSnowflake) * radius;
			for(var j = 0; j < n2; j++)p.positions.push(ran2() * r, ran2() * r);
		}


		function update()
		{
			out.strokeStyle = "hsl(170, 50%, 75%)";
			out.beginPath();
			for(var i = 0; i < nSnowflake; i++)
			{
				var ratio = i / nSnowflake;
				var p = particles[i];
				p.vx = fr * p.vx + v * ran2() + wind - 0.1 * p.y / stage.height;
				p.vy = fr * p.vy + v * ran2() + gravity;
				p.va = fr * p.va + 0.01 * ran2();
				p.x += p.vx;
				p.y += (1 - ratio) * p.vy;
				p.a += p.va;
				if(p.x < 0) p.x = stage.width;
				else if(p.x > stage.width) p.x = 0;
				if(p.y > stage.height) {p.y = -radius; p.vx = p.vy = 0;};
		
				out.save();
				out.translate(p.x, p.y);
				out.rotate(p.a);
				var pos = p.positions;
				out.moveTo(pos[0], pos[1]);
				for(var j = 2; j < 2 * n2; j+=2)
				{
					out.lineTo(pos[j], pos[j + 1]);
				}
				out.restore();
			}
			out.stroke();
		}
		return {update:update};
	})();


	addPoint();

	var vRotation = 0;
	function interpolate(min, max, ratio) { return min + ratio * (max - min); }
	function update()
	{
		if(n > 25)
		{
			if(vRotation < 0.003) vRotation += 0.00001;
			if(nSnowflake < maxSnowflake && Math.random() < 0.01) nSnowflake++;
		}
		rotation.rotate(0, 1, 0, vRotation);
		transform.identity();
		transform.appendTransform(rotation);
		transform.appendTransform(renderer);
		stage.out.clearRect(0, 0, stage.width, stage.height);
		for(var i = 0; i < n; i++)
		{
			var v = vertices[i];
			v.spring3d.apply();
			transform.transformVector(v);
			if(v.spring2d)v.spring2d.apply(mouse.x, mouse.y);
		}
		lineRenderer.render(vertices);
		dotsRenderer.render(vertices);
		snow.update();	
	}
	update();
	stage.play(update, this);

	window.onresize = resize;
	
})()
