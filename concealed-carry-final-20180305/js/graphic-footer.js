var pymChild=null;var isMobile=false;var onWindowLoaded=function(){pymChild=new pym.Child({});pymChild.onMessage('on-screen',function(bucket){ANALYTICS.trackEvent('on-screen',bucket);});pymChild.onMessage('scroll-depth',function(data){ANALYTICS.trackEvent('scroll-depth',data.percent,data.seconds);});};var artboardResizer=function(){if(document.documentElement.className.indexOf('g-resizer-v3-init')>-1)return;document.documentElement.className+=' g-resizer-v3-init';if(!('querySelector' in document))return;function resizer(){var elements=Array.prototype.slice.call(document.querySelectorAll('.g-artboard[data-min-width]')),widthById={};elements.forEach(function(el){var parent=el.parentNode,width=widthById[parent.id]||parent.getBoundingClientRect().width,minwidth=el.getAttribute('data-min-width'),maxwidth=el.getAttribute('data-max-width');widthById[parent.id]=width;if(+minwidth<=width&&(+maxwidth>=width||maxwidth===null))el.style.display='block';else el.style.display='none';});try{if(window.parent&&window.parent.$)window.parent.$('body').trigger('resizedcontent',[window]);if(window.require)require(['foundation/main'],function(){require(['shared/interactive/instances/app-communicator'],function(AppCommunicator){AppCommunicator.triggerResize();});});}catch(e){console.log(e);}pymChild.sendHeight();}document.addEventListener('DOMContentLoaded',resizer);window.addEventListener('resize',_.throttle(resizer,200));};var annotations={'database':'g-ai0-2','review-board':'g-ai0-8','objection':'g-ai0-5'};var mobileAnnotations={'database':'g-ai1-2','review-board':'g-ai1-9','objection':'g-ai1-5'};function pairAnnotations(dict,id){setTimeout(function(){for(var key in dict)if(id==key){var annotation='#'+dict[key];$(annotation).addClass('show');}},0);}$('.annotation-trigger').mouseover(function(){var id=$(this).attr('id');if($('#g-ai2html-graphic-Artboard_1').css('display')=='block')pairAnnotations(annotations,id);else pairAnnotations(mobileAnnotations,id);$('.g-annotation').removeClass('show');$('.annotation-trigger').removeClass('selected');$(this).addClass('selected');});window.onload=onWindowLoaded;