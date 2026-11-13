"""Reproducible miniature decoder, trained with NumPy and explicit backprop.

Run: python scripts/train-story-model.py (requires numpy 2.x).
No pretrained weights, network, or language-model API. All data is synthetic.
"""
import os
os.environ.setdefault('OPENBLAS_NUM_THREADS', '1')
os.environ.setdefault('OMP_NUM_THREADS', '1')
import json
import hashlib
from pathlib import Path
import numpy as np

SEED = 20261028
rng = np.random.default_rng(SEED)
D, H, F, C = 32, 2, 64, 64
VOCAB = ['Catatan', ':', ' kunci', ' cadangan', ' ada', ' di', ' laci', ' biru', '.', '\nPertanyaan', ' Di', ' mana', '?', '\nJawaban', ' hijau', ' kartu', ' akses', ' tas', ' merah', '<eos>', ' buku', ' catatan', ' kotak', ' kuning', ' dompet', ' kecil', ' lemari', ';', ' tidak', ' diketahui', ' lama', ' baru']
objects = [(2, 3), (15, 16), (20, 21), (24, 25)]
places, colors = [6, 17, 22, 26], [7, 14, 18, 23]

def record(o, p, c):
    return [*objects[o], 4, 5, p, c]

def example(o, p, c, other=None):
    note = record(o, p, c)
    if other is not None:
        # Both orders occur: the requested object is not always the last one.
        oo, pp, cc, first = other
        second = record(oo, pp, cc)
        note = second + [27] + note if first else note + [27] + second
    prompt = [0, 1, *note, 8, 9, 1, 10, 11, *objects[o], 12, 13, 1]
    return {'ids': prompt, 'answer': [5, p, c, 8, 19], 'object': o, 'place': p, 'color': c}

train, held = [], []
for o in range(4):
    for pi, p in enumerate(places):
        for c in colors:
            # Entire object/location combinations are held out, including colors.
            target = held if (o + pi) % 4 == 3 else train
            target.append(example(o, p, c))
            for oo in range(4):
                if oo == o:
                    continue
                for first in [False, True]:
                    target.append(example(o, p, c, (oo, places[(pi+1)%4], colors[(colors.index(c)+1)%4], first)))

P = {}
def param(name, shape, scale=.12, fill=None):
    P[name] = rng.normal(0, scale, shape) if fill is None else np.full(shape, fill, dtype=float)
param('E', (len(VOCAB), D))
param('P', (C, D), .04)
for l in range(2):
    for norm in ['ln1', 'ln2']:
        param(f'{l}.{norm}.g', (D,), fill=1)
        param(f'{l}.{norm}.b', (D,), fill=0)
    for name, a, b in [('q',D,D),('k',D,D),('v',D,D),('o',D,D),('up',D,F),('down',F,D)]:
        param(f'{l}.{name}.w', (a,b), 1/np.sqrt(a)*.5)
        param(f'{l}.{name}.b', (b,), fill=0)
param('final.g', (D,), fill=1)
param('final.b', (D,), fill=0)
param('out.b', (len(VOCAB),), fill=0)

def softmax(x):
    e = np.exp(x - x.max(axis=-1, keepdims=True))
    return e / e.sum(axis=-1, keepdims=True)

def forward(ids, backward=False):
    tape = []
    def linear(x, key):
        y = x @ P[key+'.w'] + P[key+'.b']
        def back(g, grads):
            grads[key+'.w'] += x.reshape(-1,x.shape[-1]).T @ g.reshape(-1,g.shape[-1])
            grads[key+'.b'] += g.sum(axis=(0,1))
            return g @ P[key+'.w'].T
        return y, back
    def norm(x, key):
        xc = x-x.mean(-1,keepdims=True)
        inv = 1/np.sqrt((xc*xc).mean(-1,keepdims=True)+1e-5)
        n = xc*inv
        def back(g, grads):
            grads[key+'.g'] += (g*n).sum(axis=(0,1))
            grads[key+'.b'] += g.sum(axis=(0,1))
            v = g*P[key+'.g']
            return inv*(v-v.mean(-1,keepdims=True)-n*(v*n).mean(-1,keepdims=True))
        return n*P[key+'.g']+P[key+'.b'], back
    B,T = ids.shape
    x = P['E'][ids]+P['P'][np.arange(T)]
    for l in range(2):
        u, bn1 = norm(x, f'{l}.ln1')
        qs, bq = linear(u, f'{l}.q')
        ks, bk = linear(u, f'{l}.k')
        vs, bv = linear(u, f'{l}.v')
        def split(z): return z.reshape(B,T,H,D//H).transpose(0,2,1,3)
        q,k,v = split(qs),split(ks),split(vs)
        scores = q @ k.swapaxes(-1,-2) / np.sqrt(D//H)
        scores[:,:,np.triu_indices(T,1)[0],np.triu_indices(T,1)[1]] = -1e30
        a = softmax(scores)
        z = (a@v).transpose(0,2,1,3).reshape(B,T,D)
        att, bo = linear(z, f'{l}.o')
        r = x+att
        n, bn2 = norm(r, f'{l}.ln2')
        pre, bu = linear(n, f'{l}.up')
        tanh = np.tanh(np.sqrt(2/np.pi)*(pre+.044715*pre**3))
        act = .5*pre*(1+tanh)
        mlp, bd = linear(act, f'{l}.down')
        x = r+mlp
        tape.append((bn1,bq,bk,bv,bo,bn2,bu,bd,q,k,v,a,pre,tanh))
    final, bfinal = norm(x, 'final')
    logits = final @ P['E'].T + P['out.b']
    if not backward:
        return logits
    def back(g):
        grads = {k: np.zeros_like(v) for k,v in P.items()}
        grads['E'] += g.reshape(-1,len(VOCAB)).T @ final.reshape(-1,D)
        grads['out.b'] += g.sum(axis=(0,1))
        dx = bfinal(g@P['E'],grads)
        for bn1,bq,bk,bv,bo,bn2,bu,bd,q,k,v,a,pre,tanh in reversed(tape):
            da = bd(dx,grads)
            derivative = .5*(1+tanh)+.5*pre*(1-tanh*tanh)*np.sqrt(2/np.pi)*(1+3*.044715*pre*pre)
            dr = dx + bn2(bu(da*derivative,grads),grads)
            dz = bo(dr,grads).reshape(B,T,H,D//H).transpose(0,2,1,3)
            dA = dz @ v.swapaxes(-1,-2)
            dV = a.swapaxes(-1,-2) @ dz
            ds = a*(dA-(dA*a).sum(-1,keepdims=True))/np.sqrt(D//H)
            dQ = ds@k
            dK = ds.swapaxes(-1,-2)@q
            def merge(y): return y.transpose(0,2,1,3).reshape(B,T,D)
            du = bq(merge(dQ),grads)+bk(merge(dK),grads)+bv(merge(dV),grads)
            dx = dr+bn1(du,grads)
        np.add.at(grads['E'], ids, dx)
        grads['P'][:T] += dx.sum(0)
        return grads
    return logits, back

def batch(rows):
    size = max(len(e['ids'])+len(e['answer'])-1 for e in rows)
    ids = np.full((len(rows),size),19,dtype=int)
    targets = ids.copy()
    mask = np.zeros_like(ids,dtype=float)
    for i,e in enumerate(rows):
        sequence = e['ids']+e['answer']
        ids[i,:len(sequence)-1] = sequence[:-1]
        targets[i,:len(sequence)-1] = sequence[1:]
        mask[i,len(e['ids'])-1:len(sequence)-1] = 1
    return ids,targets,mask

def loss_for(rows):
    ids,y,mask = batch(rows)
    p = softmax(forward(ids))
    return float((-np.log(p[np.arange(len(rows))[:,None],np.arange(ids.shape[1]),y]+1e-30)*mask).sum()/mask.sum())

def generate(e):
    ids = list(e['ids'])
    out = []
    for _ in range(8):
        token = int(forward(np.array([ids]))[0,-1].argmax())
        out.append(token)
        if token == 19: break
        ids.append(token)
    return out

if __name__ == '__main__':
    m = {k: np.zeros_like(v) for k,v in P.items()}
    v = {k: np.zeros_like(v) for k,v in P.items()}
    history = []
    steps = int(os.environ.get('STORY_TRAIN_STEPS','1800'))
    for step in range(steps+1):
        if step % 100 == 0:
            row = {'step': step, 'trainLoss': loss_for(train), 'heldOutLoss': loss_for(held)}
            history.append(row)
            print(json.dumps(row),flush=True)
        if step == steps: break
        rows = [train[i] for i in rng.integers(0,len(train),32)]
        ids,y,mask = batch(rows)
        logits, back = forward(ids,True)
        g = softmax(logits)
        g[np.arange(len(rows))[:,None],np.arange(ids.shape[1]),y] -= 1
        g *= mask[:,:,None]/mask.sum()
        grads = back(g)
        total = np.sqrt(sum((x*x).sum() for x in grads.values()))
        for key in P:
            grad = grads[key]*min(1,1/(total+1e-12))
            m[key] = .9*m[key]+.1*grad
            v[key] = .999*v[key]+.001*grad*grad
            P[key] -= .003*(m[key]/(1-.9**(step+1)))/(np.sqrt(v[key]/(1-.999**(step+1)))+1e-8)
    evaluation = []
    for split, rows in [('train',train),('held-out',held)]:
        for e in rows:
            predicted = generate(e)
            evaluation.append({'split':split,'promptIds':e['ids'],'expected':e['answer'],'predicted':predicted,'correct':predicted==e['answer']})
    weights = {k:v.tolist() for k,v in P.items()}
    checksum = hashlib.sha256(json.dumps(weights,separators=(',',':')).encode()).hexdigest()
    model = {'version':'keys-decoder-v1','checkpoint':checksum,'tokenizer':'literal-longest-match-v1','seed':SEED,
             'profile':{'width':D,'heads':H,'headWidth':D//H,'ff':F,'layers':2,'maxTokens':C,'vocabulary':len(VOCAB),'tiedEmbedding':True,'normalization':'learned LayerNorm, epsilon 1e-5','position':'learned absolute','activation':'tanh GELU'},
             'vocab':VOCAB,'weights':weights,'training':{'steps':steps,'optimizer':'Adam','learningRate':.003,'batchSize':32,'objective':'next-token cross-entropy on answer positions; all parameters receive backpropagation','trainExamples':len(train),'heldOutExamples':len(held),'splitRule':'(objectIndex + locationIndex) % 4 == 3 held out; all colors and both distractor orders held together','history':history,'parameterCount':sum(x.size for x in P.values()),'numpyVersion':np.__version__}}
    root = Path(__file__).resolve().parents[1]
    target = root/'src'/'simulation'/'story'
    target.mkdir(parents=True,exist_ok=True)
    (target/'checkpoint.json').write_text(json.dumps(model,separators=(',',':')),encoding='utf-8')
    (target/'evaluation.json').write_text(json.dumps(evaluation,separators=(',',':')),encoding='utf-8')
    references = [{'ids':e['ids'],'logits':forward(np.array([e['ids']]))[0].tolist()} for e in [example(0,6,7),example(0,6,14),example(1,17,18)]]
    (target/'reference.json').write_text(json.dumps(references,separators=(',',':')),encoding='utf-8')
    for split in ['train','held-out']:
        subset = [e for e in evaluation if e['split']==split]
        print(split,sum(e['correct'] for e in subset),'/',len(subset),flush=True)
    print('Checkpoint',checksum,flush=True)
