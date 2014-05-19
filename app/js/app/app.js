define(['three', 'threejs/scene', 'threejs/cameras', 'threejs/renderer', 'threejs/materials', 'ring', 'threejs/controls', 'threejs/exporters', 'two', 'twojs/scene', 'section', 'fileselector', 'filters', 'heightmap', 'constraints', 'gui'], function (THREE, scene, camera, renderer, material, Ring, controls, exporters, Two, TwoScene, section, selector, Filter, Heightmap, Constraint, gui) {
  'use strict';
  var app = {
    mesh: null,
    sections: [],
    ringWorker: new Worker('js/app/ring_worker.js'),
    init: function () {
      var twoContainers = document.getElementsByClassName('twojs-container'),
      twoScenes = [],
      i = 0,
      twoScene, workerHandle;
      
      workerHandle = function (msg) {
        this.ringWorker.removeEventListener('message', workerHandle, false);
        console.log(msg.data);

        this.handleEvents(function () {
          gui.init();
        });
        
        for (i; i < twoContainers.length; i += 1) {
          twoScene = new TwoScene(twoContainers[i]);
          twoScenes.push(twoScene);
          this.sections.push(section(twoScene));
          twoScene.update();
        }

        this.updateRing(this.sections, gui.param.circumference);
      }.bind(this);

      this.ringWorker.addEventListener('message', workerHandle, false);

    },
    handleEvents: function (next) {
      window.addEventListener('import', function () {
        selector.select();
      }.bind(this));

      window.addEventListener('export', function () {
        exporters.obj(this.mesh.geometry);
      }.bind(this));

      window.addEventListener('sectionchange', function () {
        this.updateRing(this.sections, gui.param.circumference);
      }.bind(this));

      window.addEventListener('circumferencechange', function () {
        this.updateRing(this.sections, gui.param.circumference);
      }.bind(this));

      window.addEventListener('filechange', function () {
        selector.getSelectedFile();
      }.bind(this));

      window.addEventListener('filereadcomplete', function () {
        var filter = new Filter(selector.getInputData()),
        imgData = filter.setGrayScale(),
        heightmap = null,
        arrHeightmap = null,
        constraint = new Constraint();

        // Apply filter on the image
        selector.setImageDataInContext(imgData);

        // Create the heightmap scale 32
        heightmap = new Heightmap(imgData);
        arrHeightmap = heightmap.getHeightMap(3 * 255);
        console.log(arrHeightmap);
        /*alert('Checking if heightmap is valid...');
        if (constraint.isHeightmapValid(arrHeightmap, imgData.width, 1000)) {
          alert('Heightmap is valid');
        }
        else {
          alert('Heightmap is not valid');
        }*/
      }.bind(this));

      if (next) {
        next();
      }
    },
    updateRing: function (sections, circumference) {
      function twoTothree(vertices) {
        var pts = [],
        i = 0,
        p0, p0three, p1three, p2three, p3, p3three, curve;

        for (i; i < vertices.length; i++) {
          p0 = vertices[i];
          p0three = new THREE.Vector3(p0.x / 10, p0.y / 10, 0);
          p3 = vertices[(i + 1) % vertices.length];
          p3three = new THREE.Vector3(p3.x / 10, p3.y / 10, 0);

          p1three = new THREE.Vector3(p0.controls.right.x / 10, p0.controls.right.y / 10, 0);
          p2three = new THREE.Vector3(p3.controls.left.x / 10, p3.controls.left.y / 10, 0);

          curve = new THREE.CubicBezierCurve3(p0three, p1three, p2three, p3three);
          pts = pts.concat(curve.getPoints(30));
        }

        return pts;
      }
      var scts = [],
      radius = circumference / (Math.PI * 2),
      ring, mesh, workerHandle;
      
      this.sections.forEach(function (val) {
        scts.push(twoTothree(val.vertices));
      });

      ring = new Ring(scts, radius);
      mesh = new THREE.Mesh(ring.getGeometry(), material.wire);

      scene.remove(this.mesh);
      scene.add(mesh);
      this.mesh = mesh;

      // Web worker experiment
      /*workerHandle = function (msg) {
        var geometry = new THREE.Geometry(),
        data = JSON.parse(msg.data),
        i;
        
        this.ringWorker.removeEventListener('message', workerHandle, false);

        for (i = 0; i < data.vertices.length; i++){
          geometry.vertices.push(
            new THREE.Vector3(
              data.vertices[i].x,
              data.vertices[i].y,
              data.vertices[i].z
            )
          );
        }
        for (i = 0; i < data.faces.length; i++){
          geometry.faces.push(
            new THREE.Face3(
              data.faces[i].a,
              data.faces[i].b,
              data.faces[i].c
            )
          );
        }

        mesh = new THREE.Mesh(geometry, material.wire);
        
        scene.remove(this.mesh);
        scene.add(mesh);
        this.mesh = mesh;
      }.bind(this);

      this.ringWorker.addEventListener('message', workerHandle, false);
      this.ringWorker.postMessage(JSON.stringify({sections: scts, radius: radius}));*/
    },
    animate: function () {
      window.requestAnimationFrame(app.animate);
      controls.orbit.update();
      renderer.render(scene, camera);
    },
    dev: function () {
      var axisHelper = new THREE.AxisHelper(100),
      gridHelper = new THREE.GridHelper(100, 50);
      scene.add(axisHelper);
      scene.add(gridHelper);
    }
  };
  return app;
});
