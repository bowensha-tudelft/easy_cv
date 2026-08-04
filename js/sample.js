/* Easy CV — 默认示例数据（首次打开无草稿时载入）
   这是演示用的假数据（fake.json），仅名字"Bowen Sha"为真实，其余均为虚构。 */
'use strict';

const SAMPLE = {
  schemaVersion: 1,
  theme: 'classic',
  accent: '#1f3864',
  meta: { dateFormat: 'MMM YYYY' },
  blocks: [
    {
      id: 'b_f1', type: 'header', collapsed: true,
      data: {
        name: 'Bowen Sha', title: 'PhD Candidate in Computational Chemistry',
        email: 'bsha@mit.edu', phone: '+1 (617) 555-0142', location: 'Cambridge, MA, USA',
        summary: 'Computational chemist specializing in machine-learning force fields, molecular dynamics, and first-principles simulation of energy materials. Passionate about bridging machine learning and quantum chemistry to accelerate materials discovery.',
        links: [
          { id: 'l_f1', label: '', icon: 'scholar', url: 'https://scholar.google.com/citations?user=fake0001' },
          { id: 'l_f2', label: '', icon: 'github', url: 'https://github.com/bowensha' },
          { id: 'l_f3', label: '', icon: 'linkedin', url: 'https://linkedin.com/in/bowen-sha' },
          { id: 'l_f4', label: '', icon: 'orcid', url: 'https://orcid.org/0000-0000-0000-0000' }
        ]
      }
    },
    {
      id: 'b_f2', type: 'education', collapsed: true,
      data: {
        institution: 'Massachusetts Institute of Technology', location: 'Cambridge, MA, USA',
        degree: 'PhD', area: 'Chemistry', startDate: '2024-09', endDate: '', current: true,
        score: '', courses: [], highlights: ['Thesis: Machine-Learning Force Fields for Single-Atom Catalysis']
      }
    },
    {
      id: 'b_f3', type: 'education', collapsed: true,
      data: {
        institution: 'Stanford University', location: 'Stanford, CA, USA',
        degree: 'MSc', area: 'Chemistry', startDate: '2021-09', endDate: '2024-07', current: false,
        score: '3.9 / 4.0', courses: [], highlights: ['Thesis: Reactive Force Fields for Polymer Electrolytes']
      }
    },
    {
      id: 'b_f4', type: 'education', collapsed: true,
      data: {
        institution: 'University of California, Berkeley', location: 'Berkeley, CA, USA',
        degree: 'BSc', area: 'Chemistry', startDate: '2017-09', endDate: '2021-07', current: false,
        score: '', courses: [], highlights: ['Minor in Applied Mathematics']
      }
    },
    {
      id: 'b_f5', type: 'research', collapsed: true,
      data: {
        position: 'Machine-Learning Force Fields for Single-Atom Catalysts',
        organization: 'Department of Chemistry, Massachusetts Institute of Technology',
        location: 'Cambridge, MA, USA', startDate: '2024-09', endDate: '', current: true,
        url: '', summary: 'Developing equivariant graph-neural-network force fields for transition-metal single-atom catalysts.',
        highlights: [
          'Trained a GNN potential on 50k DFT frames, achieving sub-1 meV/atom accuracy',
          'Reproduced experimentally observed adsorption energies of CO2 on Fe single-atom sites',
          'Released an open-source training pipeline used by 4 research groups'
        ]
      }
    },
    {
      id: 'b_f6', type: 'research', collapsed: true,
      data: {
        position: 'AI-Driven Molecular Dynamics of Polymer Electrolytes',
        organization: 'Department of Chemistry, Stanford University',
        location: 'Stanford, CA, USA', startDate: '2022-09', endDate: '2024-07', current: false,
        url: '', summary: 'Combined classical and machine-learned force fields to study ion transport in solid polymer electrolytes.',
        highlights: [
          'Elucidated the role of segmental dynamics in lithium-ion conductivity via long-timescale MD',
          'Predicted a 3x conductivity improvement for a novel copolymer design',
          'Co-authored 2 papers (J. Phys. Chem. C, ACS Cent. Sci.)'
        ]
      }
    },
    {
      id: 'b_f7', type: 'research', collapsed: true,
      data: {
        position: 'Photocatalytic CO2 Reduction Mechanisms',
        organization: 'Lawrence Berkeley National Laboratory',
        location: 'Berkeley, CA, USA', startDate: '2021-06', endDate: '2022-08', current: false,
        url: '', summary: 'DFT and constrained-CDFT study of CO2 activation on oxide photocatalysts.',
        highlights: [
          'Mapped the free-energy landscape for CO2-to-CO conversion on TiO2 surfaces',
          'Identified oxygen vacancies as the key active sites, guiding catalyst design',
          'Contributed to a DOE milestone report on solar fuels'
        ]
      }
    },
    {
      id: 'b_f8', type: 'research', collapsed: true,
      data: {
        position: 'DFT Screening of Metal–Organic Frameworks for Gas Storage',
        organization: 'University of California, Berkeley',
        location: 'Berkeley, CA, USA', startDate: '2019-06', endDate: '2021-05', current: false,
        url: '', summary: 'High-throughput density-functional screening of MOFs for methane and hydrogen storage.',
        highlights: [
          'Screened 1,200+ hypothetical MOFs and shortlisted 12 top candidates',
          'Correlated pore topology with volumetric uptake, enabling descriptor-based design',
          'Open-sourced the screening dataset (4.8 GB)'
        ]
      }
    },
    {
      id: 'b_f9', type: 'custom', collapsed: true,
      data: {
        title: 'Teaching Experience', position: 'Teaching Assistant — Physical Chemistry',
        organization: 'Department of Chemistry, Massachusetts Institute of Technology',
        location: 'Cambridge, MA, USA', startDate: '2025-01', endDate: '', current: true,
        url: '', summary: '',
        highlights: [
          'Led discussion sections of 40 students; held weekly office hours',
          'Authored problem sets and grading rubrics for 5.60 Thermodynamics & Kinetics',
          'Received a departmental teaching commendation (Spring 2025)'
        ]
      }
    },
    { id: 'b_f10', type: 'skills', collapsed: true, data: { name: 'Programming', keywords: ['Python', 'PyTorch', 'C++', 'Shell'] } },
    { id: 'b_f11', type: 'skills', collapsed: true, data: { name: 'Simulation', keywords: ['Gaussian', 'ORCA', 'VASP', 'LAMMPS', 'GROMACS'] } },
    { id: 'b_f12', type: 'skills', collapsed: true, data: { name: 'Machine Learning', keywords: ['DeepMD-kit', 'PyTorch Geometric', 'Scikit-learn', 'HuggingFace'] } },
    { id: 'b_f13', type: 'skills', collapsed: true, data: { name: 'Tools', keywords: ['Linux', 'Git', 'HPC / Slurm', 'LaTeX'] } },
    {
      id: 'b_f14', type: 'custom', collapsed: true,
      data: {
        title: 'Selected Publications', position: '', organization: '', location: '',
        startDate: '', endDate: '', current: false, url: '', summary: '',
        highlights: [
          'Sha, B., et al. "Equivariant Graph Neural Network Potentials for Single-Atom Catalysis", J. Am. Chem. Soc., 2026',
          'Sha, B., et al. "Ion Transport in Copolymer Electrolytes: A Machine-Learned Force Field Study", ACS Cent. Sci., 2025',
          'Sha, B., et al. "Descriptor-Based Screening of Metal–Organic Frameworks", Chem. Mater., 2024'
        ]
      }
    }
  ]
};
