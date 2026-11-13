"""Finite-difference check for the explicit backprop implementation."""
import importlib.util
from pathlib import Path
spec = importlib.util.spec_from_file_location('story_training', Path(__file__).with_name('train-story-model.py'))
t = importlib.util.module_from_spec(spec)
spec.loader.exec_module(t)
np = t.np
ids, targets, mask = t.batch([t.train[0],t.train[4]])
logits, backward = t.forward(ids, True)
g = t.softmax(logits)
g[np.arange(len(ids))[:,None],np.arange(ids.shape[1]),targets] -= 1
g *= mask[:,:,None]/mask.sum()
grads = backward(g)
def loss():
    p=t.softmax(t.forward(ids))
    return float((-np.log(p[np.arange(len(ids))[:,None],np.arange(ids.shape[1]),targets])*mask).sum()/mask.sum())
worst=0
for name, index in [('E',(2,0)),('E',(5,3)),('P',(7,4)),('0.q.w',(1,3)),('0.k.w',(2,1)),('0.v.w',(1,4)),('0.o.w',(2,3)),('0.ln1.g',(3,)),('0.ln2.b',(2,)),('1.up.w',(1,3)),('1.down.w',(3,2)),('final.g',(2,)),('out.b',(7,))]:
    original=t.P[name][index]
    eps=1e-5
    t.P[name][index]=original+eps
    plus=loss()
    t.P[name][index]=original-eps
    minus=loss()
    t.P[name][index]=original
    numerical=(plus-minus)/(2*eps)
    actual=grads[name][index]
    error=abs(numerical-actual)
    assert error < 1e-6, (name,index,numerical,actual)
    worst=max(worst,error)
print('13 gradient probes passed; maximum absolute error:',worst)
